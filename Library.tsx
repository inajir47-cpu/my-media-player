import { useRef, useState } from 'react';
import { api } from '../api';
import type { ScanResult, TitleDetail } from '../types';
import { toast } from '../components/Toaster';

export default function Library() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const mediaFilesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const jsonFileInput = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    try {
      const res = await api.scanFiles(files);
      setScanResult(res);
      toast(`Added ${res.titlesAdded} titles (${res.episodesAdded} episodes)`);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Failed to scan selected files');
    } finally {
      setScanning(false);
    }
  };

  const exportJson = async () => {
    setExporting(true);
    try {
      const lib = await api.getLibrary();
      const details: TitleDetail[] = [];
      for (const t of lib.titles) {
        try {
          details.push(await api.getTitle(t.id));
        } catch { /* skip */ }
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        titles: details.map((d) => ({
          id: d.title.id,
          kind: d.title.kind,
          name: d.title.name,
          year: d.title.year,
          description: d.title.description,
          genre: d.title.genre,
          language: d.title.language,
          rating: d.title.rating,
          poster: d.title.poster,
          backdrop: d.title.backdrop,
          providers: d.providers,
          reviews: d.reviews,
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-media-metadata-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(`Exported ${details.length} titles`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const payload = JSON.parse(await file.text());
      const items: Array<{ id?: string; name?: string } & Record<string, unknown>> = payload.titles ?? [];
      if (!Array.isArray(items) || items.length === 0) {
        toast('No titles found in that file');
        return;
      }
      const lib = await api.getLibrary();
      const byId = new Map(lib.titles.map((t) => [t.id, t]));
      const byName = new Map(lib.titles.map((t) => [t.name.toLowerCase(), t]));
      let applied = 0;
      let skipped = 0;
      for (const item of items) {
        const match = (item.id && byId.get(item.id)) ?? (item.name && byName.get(String(item.name).toLowerCase()));
        if (!match) { skipped++; continue; }
        try {
          await api.updateTitle(match.id, {
            name: typeof item.name === 'string' ? item.name : undefined,
            year: typeof item.year === 'number' ? item.year : null,
            description: typeof item.description === 'string' ? item.description : null,
            genre: typeof item.genre === 'string' ? item.genre : null,
            language: typeof item.language === 'string' ? item.language : null,
            rating: typeof item.rating === 'number' ? item.rating : null,
          });
          if (Array.isArray(item.providers)) {
            await api.updateProviders(match.id, item.providers as { name: string; url: string }[]);
          }
          applied++;
        } catch {
          skipped++;
        }
      }
      toast(`Import done: ${applied} applied, ${skipped} skipped`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
      if (jsonFileInput.current) jsonFileInput.current.value = '';
    }
  };

  return (
    <div className="page"><div className="container">
      <h1 className="page-title">Library</h1>
      <p className="page-sub">Add videos, anime, movies, music & subtitles from your tablet storage</p>

      <div className="settings-card">
        <h2>Add Local Media</h2>
        <p>Select video/audio files (.mp4, .mkv, .mp3) and subtitle files (.srt, .vtt) from your tablet. Thumbnails, watch order, seasons, and reviews are fetched automatically.</p>

        <input
          ref={mediaFilesInput}
          type="file"
          multiple
          accept="video/*,audio/*,.mkv,.mp4,.avi,.mov,.webm,.mp3,.flac,.srt,.vtt"
          hidden
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory is supported on Android WebView/Chrome
          webkitdirectory=""
          hidden
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        <div className="export-import-row" style={{ gap: 12, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => mediaFilesInput.current?.click()} disabled={scanning}>
            {scanning ? 'Scanning & Fetching Data…' : '🎬 Pick Video / Audio Files'}
          </button>
          <button className="btn btn-outline" onClick={() => folderInput.current?.click()} disabled={scanning}>
            📁 Select Media Folder
          </button>
        </div>

        {scanning ? (
          <div className="scan-status" style={{ marginTop: 12 }}>
            <div className="spinner" style={{ width: 22, height: 22, display: 'inline-block', verticalAlign: 'middle', marginRight: 10 }} />
            Indexing files and fetching posters, watch order, seasons & reviews…
          </div>
        ) : null}
        {scanResult ? (
          <div className="scan-status" style={{ marginTop: 12 }}>
            <strong>Scan complete.</strong> {scanResult.filesScanned} files scanned —{' '}
            {scanResult.titlesAdded} titles and {scanResult.episodesAdded} episodes added.
          </div>
        ) : null}
        {scanError ? <div className="error-box" style={{ marginTop: 12 }}>{scanError}</div> : null}
      </div>

      <div className="settings-card">
        <h2>Metadata backup</h2>
        <p>Export your titles' metadata and manual overrides to a JSON file, or import a previous export.</p>
        <div className="export-import-row">
          <button className="btn btn-outline" onClick={exportJson} disabled={exporting}>
            {exporting ? 'Exporting…' : '⬇ Export JSON'}
          </button>
          <input
            ref={jsonFileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => importJson(e.target.files?.[0])}
          />
          <button className="btn btn-outline" onClick={() => jsonFileInput.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : '⬆ Import JSON'}
          </button>
        </div>
      </div>
    </div></div>
  );
}
