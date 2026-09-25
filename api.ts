import type {
  AppConfig,
  Collection,
  CollectionDetail,
  ContinueFrom,
  ContinueWatchingItem,
  Episode,
  MetadataResult,
  Provider,
  Review,
  ScanResult,
  Season,
  SubtitleTrack,
  TitleDetail,
  TitleKind,
  TitleSummary,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function continueFromToProgress(cf: ContinueFrom | null): { position: number; duration: number } | null {
  if (!cf || !cf.duration) return null;
  return { position: cf.position, duration: cf.duration };
}

// ---------------- Filename Parser (from backend/src/parse.ts) ----------------
const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm|m4v)$/i;
const AUDIO_EXT = /\.(mp3|flac|m4a|ogg|wav|aac)$/i;
const SUB_EXT = /\.(srt|vtt)$/i;

function stripExt(name: string): string {
  return name.replace(VIDEO_EXT, '').replace(AUDIO_EXT, '').replace(SUB_EXT, '');
}

function cleanName(s: string): string {
  return s
    .replace(/[._]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[\s\-_.]+$/, '')
    .trim();
}

function extractYear(name: string): { name: string; year?: number } {
  const m = name.match(/[([]((?:19|20)\d{2})[)\]]\s*$/);
  if (m) {
    return { name: name.slice(0, m.index).trim(), year: parseInt(m[1], 10) };
  }
  const m2 = name.match(/[.\s]((?:19|20)\d{2})\s*$/);
  if (m2) {
    return { name: name.slice(0, m2.index).trim(), year: parseInt(m2[1], 10) };
  }
  return { name };
}

interface ParsedName {
  show: string;
  season?: number;
  episode?: number;
  year?: number;
  kind: 'episode' | 'movie' | 'music';
}

function parseFilename(input: string): ParsedName {
  const base = input.split(/[\\/]/).pop() || input;
  const bare = stripExt(base);

  if (AUDIO_EXT.test(base)) {
    const parts = input.split(/[\\/]/);
    const file = stripExt(parts.pop() || '');
    const parent = parts.length ? cleanName(parts[parts.length - 1]) : '';
    let track: number | undefined;
    const m = file.match(/^\s*(\d{1,3})\s*[-._\s]+(.+)$/);
    if (m) track = parseInt(m[1], 10);
    const show = parent || cleanName(file);
    return { show, episode: track ?? 1, kind: 'music' };
  }

  let m = bare.match(/^(.*?)[.\s_-]+[Ss](\d{1,2})[.\s_-]*[Ee](\d{1,3})(?:[.\s_-]+(.*))?$/);
  if (m) {
    const show = cleanName(m[1] || '');
    const { name, year } = extractYear(show);
    return { show: name || show, season: parseInt(m[2], 10), episode: parseInt(m[3], 10), year, kind: 'episode' };
  }

  m = bare.match(/^(.*?)[.\s_-]+(\d{1,2})[xX](\d{1,3})(?:[.\s_-]+(.*))?$/);
  if (m) {
    const show = cleanName(m[1] || '');
    const { name, year } = extractYear(show);
    return { show: name || show, season: parseInt(m[2], 10), episode: parseInt(m[3], 10), year, kind: 'episode' };
  }

  m = bare.match(/^(.*?)[\s._\-–—]+(?:e|ep|episode\s*)?(\d{2,4})(?:[\s._\-–—]+(v\d+|part\s*\d+|ova|special))?[\s._\-–—]*(.*?)$/i);
  if (m && !bare.match(/\d{4}$/)) {
    const num = parseInt(m[2], 10);
    const show = cleanName(m[1] || '');
    if (show && num >= 1 && num <= 9999) {
      const { name, year } = extractYear(show);
      return { show: name || show, season: 1, episode: num, year, kind: 'episode' };
    }
  }

  m = bare.match(/^(.*?)[\s._\-–—]+(\d{1,2})(?:[\s._\-–—]+(.+))?$/);
  if (m) {
    const num = parseInt(m[2], 10);
    const show = cleanName(m[1] || '');
    if (show && num <= 99) {
      const { name, year } = extractYear(show);
      return { show: name || show, season: 1, episode: num, year, kind: 'episode' };
    }
  }

  const { name, year } = extractYear(bare);
  if (year) {
    return { show: cleanName(name), year, kind: 'movie' };
  }

  return { show: cleanName(bare), season: 1, episode: 1, kind: 'episode' };
}

// ---------------- Metadata Fetchers (AniList, TVmaze, Jikan) ----------------
function stripHtml(s?: string | null): string | undefined {
  if (!s) return undefined;
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() || undefined;
}

async function fetchJson(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function anilistSearch(q: string): Promise<MetadataResult[]> {
  const data = await fetchJson('https://graphql.anilist.io', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query ($q: String) { Page(perPage: 6) { media(search: $q, type: ANIME) {
        id title { english romaji native } startDate { year } description coverImage { large }
      } } }`,
      variables: { q },
    }),
  });
  return (data?.data?.Page?.media || []).map((m: any) => ({
    provider: 'anilist',
    providerId: String(m.id),
    name: m.title?.english || m.title?.romaji || m.title?.native || 'Unknown',
    year: m.startDate?.year ?? null,
    poster: m.coverImage?.large ?? null,
    description: stripHtml(m.description)?.slice(0, 400) ?? null,
  }));
}

async function tvmazeSearch(q: string): Promise<MetadataResult[]> {
  const data = await fetchJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
  return (data || []).slice(0, 6).map((r: any) => ({
    provider: 'tvmaze',
    providerId: String(r.show?.id),
    name: r.show?.name || 'Unknown',
    year: r.show?.premiered ? parseInt(r.show.premiered.slice(0, 4), 10) : null,
    poster: r.show?.image?.medium || r.show?.image?.original || null,
    description: stripHtml(r.show?.summary)?.slice(0, 400) ?? null,
  }));
}

async function jikanSearch(q: string): Promise<MetadataResult[]> {
  const data = await fetchJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=6`);
  return (data?.data || []).map((a: any) => ({
    provider: 'jikan',
    providerId: String(a.mal_id),
    name: a.title_english || a.title || 'Unknown',
    year: a.year ?? null,
    poster: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
    description: a.synopsis?.slice(0, 400) ?? null,
  }));
}

// ---------------- Local IndexedDB Storage & Blob Streaming ----------------
interface StoredState {
  config: AppConfig;
  titles: Record<string, TitleDetail & { manualFields?: Partial<TitleSummary> }>;
  collections: Record<string, { id: string; name: string; titleIds: string[]; updatedAt: string }>;
}

const DB_NAME = 'MyMediaPlayerDB';
const DB_VERSION = 1;
const streamUrls = new Map<string, string>();
const subtitleTracks = new Map<string, SubtitleTrack[]>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      if (!db.objectStoreNames.contains('subtitles')) db.createObjectStore('subtitles');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadState(): Promise<StoredState> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction('state', 'readonly');
    const req = tx.objectStore('state').get('root');
    req.onsuccess = () => {
      resolve(
        req.result || {
          config: { mediaPaths: ['Android Local Storage'] },
          titles: {},
          collections: {},
        }
      );
    };
    req.onerror = () =>
      resolve({ config: { mediaPaths: ['Android Local Storage'] }, titles: {}, collections: {} });
  });
}

async function saveState(state: StoredState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(state, 'root');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function saveMediaBlob(episodeId: string, blob: Blob): Promise<void> {
  streamUrls.set(episodeId, URL.createObjectURL(blob));
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(blob, episodeId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function hydrateStreamUrls(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(['files', 'subtitles'], 'readonly');
    const fileStore = tx.objectStore('files');
    const req = fileStore.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const epId = String(cursor.key);
        if (!streamUrls.has(epId) && cursor.value instanceof Blob) {
          streamUrls.set(epId, URL.createObjectURL(cursor.value));
        }
        cursor.continue();
      }
    };
    const subStore = tx.objectStore('subtitles');
    const subReq = subStore.openCursor();
    subReq.onsuccess = () => {
      const cursor = subReq.result;
      if (cursor) {
        const epId = String(cursor.key);
        if (!subtitleTracks.has(epId) && Array.isArray(cursor.value)) {
          subtitleTracks.set(epId, cursor.value);
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

let hydrated = false;
async function ensureHydrated(): Promise<StoredState> {
  if (!hydrated) {
    hydrated = true;
    await hydrateStreamUrls();
  }
  return loadState();
}

function srtToVtt(srt: string): string {
  const vtt = 'WEBVTT\n\n' + srt.replace(/\r\n/g, '\n').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
}

// Fetch and merge AniList (posters/watch order), TVmaze (seasons/episodes), and Jikan (reviews)
async function enrichTitleMetadata(detail: TitleDetail & { manualFields?: Partial<TitleSummary> }, queryName: string, preferredProvider?: string, preferredId?: string): Promise<void> {
  const manual = detail.manualFields || {};
  try {
    // 1. Anime details + Watch Order (Relations) from AniList
    let aniId = preferredProvider === 'anilist' ? preferredId : undefined;
    if (!aniId) {
      const res = await anilistSearch(queryName).catch(() => []);
      if (res[0]) aniId = res[0].providerId;
    }
    if (aniId) {
      const data = await fetchJson('https://graphql.anilist.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query ($id: Int) { Media(id: $id, type: ANIME) {
            id title { english romaji native } startDate { year } description
            coverImage { large extraLarge } bannerImage averageScore genres
            relations { edges { relationType(version: 2) node { id title { english romaji native } format } } }
          } }`,
          variables: { id: parseInt(aniId, 10) },
        }),
      }).catch(() => null);
      const m = data?.data?.Media;
      if (m) {
        if (!manual.poster) detail.title.poster = m.coverImage?.extraLarge || m.coverImage?.large || detail.title.poster;
        if (!manual.backdrop) detail.title.backdrop = m.bannerImage || detail.title.backdrop;
        if (!manual.description) detail.title.description = stripHtml(m.description) || detail.title.description;
        if (!manual.year && m.startDate?.year) detail.title.year = m.startDate.year;
        if (!manual.rating && m.averageScore) detail.title.rating = Math.round(m.averageScore) / 10;
        if (!manual.genre && m.genres?.length) detail.title.genre = m.genres.join(', ');

        // Add Watch Order relations (Movies, OVAs, Specials)
        const edges = m.relations?.edges || [];
        if (edges.length > 0 && detail.seasons.length > 0) {
          const s0 = detail.seasons[0];
          edges.forEach((e: any, idx: number) => {
            const rel = String(e.relationType || '').toLowerCase();
            const kind = rel.includes('movie') ? 'movie' : rel.includes('ova') || rel.includes('side') ? 'ova' : rel.includes('special') ? 'special' : null;
            if (kind) {
              const relId = `rel-${e.node?.id || idx}`;
              if (!s0.episodes.some((ep) => ep.id === relId)) {
                s0.episodes.push({
                  id: relId,
                  seasonNumber: s0.seasonNumber,
                  episodeNumber: 900 + idx,
                  name: `${e.node?.title?.english || e.node?.title?.romaji || 'Related'} (${e.relationType})`,
                  description: `Watch order relation: ${e.relationType}`,
                  itemKind: kind,
                  hasFile: false,
                });
              }
            }
          });
        }
      }
    }

    // 2. Episode titles, stills, and season breakdown from TVmaze
    let tvId = preferredProvider === 'tvmaze' ? preferredId : undefined;
    if (!tvId) {
      const tvRes = await tvmazeSearch(queryName).catch(() => []);
      if (tvRes[0]) tvId = tvRes[0].providerId;
    }
    if (tvId) {
      const show = await fetchJson(`https://api.tvmaze.com/shows/${encodeURIComponent(tvId)}?embed=episodes`).catch(() => null);
      if (show?.id) {
        if (!manual.poster && !detail.title.poster) detail.title.poster = show.image?.original || show.image?.medium;
        if (!manual.description && !detail.title.description) detail.title.description = stripHtml(show.summary);
        if (!manual.language && show.language) detail.title.language = show.language;
        const eps: any[] = show._embedded?.episodes || [];
        for (const ep of eps) {
          const sNum = ep.season ?? 1;
          const eNum = ep.number ?? 1;
          let season = detail.seasons.find((s) => s.seasonNumber === sNum);
          if (!season) {
            season = { seasonNumber: sNum, episodes: [] };
            detail.seasons.push(season);
          }
          const existing = season.episodes.find((x) => x.episodeNumber === eNum);
          if (existing) {
            if (ep.name) existing.name = ep.name;
            if (ep.summary) existing.description = stripHtml(ep.summary) ?? existing.description;
            if (ep.image?.medium || ep.image?.original) existing.still = ep.image.medium || ep.image.original;
          }
        }
        detail.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
      }
    }

    // 3. Community Reviews from Jikan (MyAnimeList)
    let malId = preferredProvider === 'jikan' ? preferredId : undefined;
    if (!malId) {
      const jRes = await jikanSearch(queryName).catch(() => []);
      if (jRes[0]) malId = jRes[0].providerId;
    }
    if (malId) {
      const revData = await fetchJson(`https://api.jikan.moe/v4/anime/${encodeURIComponent(malId)}/reviews?sort=desc`).catch(() => null);
      const fetchedReviews: Review[] = (revData?.data || []).slice(0, 8).map((r: any) => ({
        author: r.user?.username || 'MAL Reviewer',
        rating: r.score ?? null,
        text: r.review || '',
        source: 'MyAnimeList',
      }));
      const userReviews = detail.reviews.filter((r) => r.source === 'user');
      detail.reviews = [...userReviews, ...fetchedReviews];
    }
  } catch {
    /* ignore network offline errors */
  }
}

export const api = {
  health: async () => ({ ok: true }),

  getConfig: async (): Promise<AppConfig> => {
    const state = await ensureHydrated();
    return state.config;
  },

  updateConfig: async (config: AppConfig): Promise<AppConfig> => {
    const state = await ensureHydrated();
    state.config = config;
    await saveState(state);
    return state.config;
  },

  /** Scan files selected via Android tablet file/folder picker */
  scanFiles: async (fileList: FileList | File[]): Promise<ScanResult> => {
    const state = await ensureHydrated();
    const files = Array.from(fileList);
    let titlesAdded = 0;
    let episodesAdded = 0;
    let filesScanned = 0;

    const subFiles: { base: string; file: File }[] = [];
    const mediaFiles: File[] = [];

    for (const f of files) {
      if (SUB_EXT.test(f.name)) {
        subFiles.push({ base: stripExt(f.name).toLowerCase(), file: f });
      } else if (VIDEO_EXT.test(f.name) || AUDIO_EXT.test(f.name)) {
        mediaFiles.push(f);
      }
    }

    const newTitleIds: string[] = [];

    for (const file of mediaFiles) {
      filesScanned++;
      const relPath = (file as any).webkitRelativePath || file.name;
      const parsed = parseFilename(relPath);
      const titleKind: TitleKind = parsed.kind === 'movie' ? 'movie' : parsed.kind === 'music' ? 'music' : 'show';
      const titleId = parsed.show.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `title-${Date.now()}`;

      if (!state.titles[titleId]) {
        state.titles[titleId] = {
          title: {
            id: titleId,
            kind: titleKind,
            name: parsed.show,
            year: parsed.year ?? null,
            poster: null,
            backdrop: null,
            rating: null,
            description: null,
            genre: null,
            episodeCount: 0,
            seasonCount: 0,
            updatedAt: new Date().toISOString(),
            language: null,
          },
          seasons: [],
          reviews: [],
          providers: [],
          continueFrom: null,
          manualFields: {},
        };
        titlesAdded++;
        newTitleIds.push(titleId);
      }

      const detail = state.titles[titleId];
      const sNum = parsed.season ?? 1;
      const eNum = parsed.episode ?? 1;
      let season: Season | undefined = detail.seasons.find((s) => s.seasonNumber === sNum);
      if (!season) {
        season = { seasonNumber: sNum, year: parsed.year ?? null, episodes: [] };
        detail.seasons.push(season);
      }

      const epId = `${titleId}-s${sNum}e${eNum}`;
      let ep: Episode | undefined = season.episodes.find((e) => e.id === epId);
      if (!ep) {
        ep = {
          id: epId,
          seasonNumber: sNum,
          episodeNumber: eNum,
          name: parsed.kind === 'movie' ? parsed.show : `Episode ${eNum}`,
          description: null,
          still: null,
          duration: null,
          itemKind: parsed.kind === 'movie' ? 'movie' : 'episode',
          hasFile: true,
          progress: null,
        };
        season.episodes.push(ep);
        episodesAdded++;
      } else {
        ep.hasFile = true;
      }

      await saveMediaBlob(epId, file);

      // Attach matching .srt / .vtt subtitle files
      const bareMedia = stripExt(file.name).toLowerCase();
      const matchingSubs = subFiles.filter((sf) => sf.base.startsWith(bareMedia));
      if (matchingSubs.length > 0) {
        const tracks: SubtitleTrack[] = [];
        for (const sf of matchingSubs) {
          const text = await sf.file.text();
          const url = sf.file.name.toLowerCase().endsWith('.srt')
            ? srtToVtt(text)
            : URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
          tracks.push({ label: sf.file.name, url });
        }
        subtitleTracks.set(epId, tracks);
        const db = await openDb();
        const tx = db.transaction('subtitles', 'readwrite');
        tx.objectStore('subtitles').put(tracks, epId);
      }

      season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      detail.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
      detail.title.seasonCount = detail.seasons.length;
      detail.title.episodeCount = detail.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
      detail.title.updatedAt = new Date().toISOString();
    }

    // Auto-fetch thumbnails, watch orders, seasons, and reviews for newly added titles
    for (const id of newTitleIds) {
      const d = state.titles[id];
      if (d && d.title.kind !== 'music') {
        await enrichTitleMetadata(d, d.title.name);
        d.title.seasonCount = d.seasons.length;
        d.title.episodeCount = d.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
      }
    }

    await saveState(state);
    return { titlesAdded, episodesAdded, filesScanned };
  },

  scan: async (): Promise<ScanResult> => {
    const state = await ensureHydrated();
    const titles = Object.values(state.titles);
    return {
      titlesAdded: titles.length,
      episodesAdded: titles.reduce((acc, t) => acc + (t.title.episodeCount ?? 0), 0),
      filesScanned: titles.reduce((acc, t) => acc + (t.title.episodeCount ?? 0), 0),
    };
  },

  getLibrary: async (): Promise<{ titles: TitleSummary[] }> => {
    const state = await ensureHydrated();
    return { titles: Object.values(state.titles).map((t) => t.title) };
  },

  getTitle: async (id: string): Promise<TitleDetail> => {
    const state = await ensureHydrated();
    const item = state.titles[id];
    if (!item) throw new ApiError(404, 'Title not found');
    return item;
  },

  updateTitle: async (id: string, fields: Partial<TitleSummary>): Promise<TitleSummary> => {
    const state = await ensureHydrated();
    const item = state.titles[id];
    if (!item) throw new ApiError(404, 'Title not found');
    item.manualFields = { ...(item.manualFields || {}), ...fields };
    item.title = { ...item.title, ...fields, updatedAt: new Date().toISOString() };
    await saveState(state);
    return item.title;
  },

  refreshTitle: async (id: string): Promise<TitleDetail> => {
    const state = await ensureHydrated();
    const item = state.titles[id];
    if (!item) throw new ApiError(404, 'Title not found');
    await enrichTitleMetadata(item, item.title.name);
    await saveState(state);
    return item;
  },

  uploadArtwork: async (titleId: string, kind: 'poster' | 'backdrop' | 'still', file: File, episodeId?: string): Promise<TitleSummary> => {
    const state = await ensureHydrated();
    const item = state.titles[titleId];
    if (!item) throw new ApiError(404, 'Title not found');
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
    if (kind === 'poster') item.title.poster = dataUrl;
    else if (kind === 'backdrop') item.title.backdrop = dataUrl;
    else if (kind === 'still' && episodeId) {
      for (const s of item.seasons) {
        const ep = s.episodes.find((e) => e.id === episodeId);
        if (ep) ep.still = dataUrl;
      }
    }
    await saveState(state);
    return item.title;
  },

  search: async (params: { q?: string; kind?: TitleKind | ''; genre?: string; sort?: string }): Promise<{ titles: TitleSummary[] }> => {
    const state = await ensureHydrated();
    let list = Object.values(state.titles).map((t) => t.title);
    if (params.q) {
      const q = params.q.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    }
    if (params.kind) list = list.filter((t) => t.kind === params.kind);
    if (params.genre) {
      const g = params.genre.toLowerCase();
      list = list.filter((t) => (t.genre || '').toLowerCase().includes(g));
    }
    return { titles: list };
  },

  continueWatching: async (): Promise<ContinueWatchingItem[]> => {
    const state = await ensureHydrated();
    const items: ContinueWatchingItem[] = [];
    for (const d of Object.values(state.titles)) {
      if (d.continueFrom) {
        for (const s of d.seasons) {
          const ep = s.episodes.find((e) => e.id === d.continueFrom?.episodeId);
          if (ep) {
            items.push({
              titleId: d.title.id,
              titleName: d.title.name,
              poster: d.title.poster,
              episodeId: ep.id,
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.episodeNumber,
              episodeName: ep.name,
              position: d.continueFrom.position,
              duration: d.continueFrom.duration,
              updatedAt: d.title.updatedAt,
            });
          }
        }
      }
    }
    return items;
  },

  updateProgress: async (episodeId: string, position: number, duration: number): Promise<{ ok: boolean }> => {
    const state = await ensureHydrated();
    for (const d of Object.values(state.titles)) {
      for (const s of d.seasons) {
        const ep = s.episodes.find((e) => e.id === episodeId);
        if (ep) {
          ep.progress = { position, duration };
          ep.duration = duration;
          d.continueFrom = { episodeId, position, duration };
          d.title.updatedAt = new Date().toISOString();
          await saveState(state);
          return { ok: true };
        }
      }
    }
    return { ok: true };
  },

  getCollections: async (): Promise<Collection[]> => {
    const state = await ensureHydrated();
    return Object.values(state.collections).map((c) => ({
      id: c.id,
      name: c.name,
      titleCount: c.titleIds.length,
      updatedAt: c.updatedAt,
    }));
  },

  createCollection: async (name: string): Promise<Collection> => {
    const state = await ensureHydrated();
    const id = `col-${Date.now()}`;
    const updatedAt = new Date().toISOString();
    state.collections[id] = { id, name, titleIds: [], updatedAt };
    await saveState(state);
    return { id, name, titleCount: 0, updatedAt };
  },

  updateCollection: async (id: string, name: string): Promise<Collection> => {
    const state = await ensureHydrated();
    const c = state.collections[id];
    if (!c) throw new ApiError(404, 'Collection not found');
    c.name = name;
    c.updatedAt = new Date().toISOString();
    await saveState(state);
    return { id: c.id, name: c.name, titleCount: c.titleIds.length, updatedAt: c.updatedAt };
  },

  deleteCollection: async (id: string): Promise<{ ok: boolean }> => {
    const state = await ensureHydrated();
    delete state.collections[id];
    await saveState(state);
    return { ok: true };
  },

  getCollection: async (id: string): Promise<CollectionDetail> => {
    const state = await ensureHydrated();
    const c = state.collections[id];
    if (!c) throw new ApiError(404, 'Collection not found');
    const titles = c.titleIds.map((tid) => state.titles[tid]?.title).filter(Boolean) as TitleSummary[];
    return { id: c.id, name: c.name, titleCount: titles.length, updatedAt: c.updatedAt, titles };
  },

  addToCollection: async (collectionId: string, titleId: string): Promise<{ ok: boolean }> => {
    const state = await ensureHydrated();
    const c = state.collections[collectionId];
    if (c && !c.titleIds.includes(titleId)) {
      c.titleIds.push(titleId);
      c.updatedAt = new Date().toISOString();
      await saveState(state);
    }
    return { ok: true };
  },

  removeFromCollection: async (collectionId: string, titleId: string): Promise<{ ok: boolean }> => {
    const state = await ensureHydrated();
    const c = state.collections[collectionId];
    if (c) {
      c.titleIds = c.titleIds.filter((id) => id !== titleId);
      c.updatedAt = new Date().toISOString();
      await saveState(state);
    }
    return { ok: true };
  },

  metadataSearch: async (q: string): Promise<MetadataResult[]> => {
    const results = await Promise.allSettled([anilistSearch(q), tvmazeSearch(q), jikanSearch(q)]);
    const out: MetadataResult[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') out.push(...r.value);
    }
    return out;
  },

  applyMetadata: async (titleId: string, provider: string, providerId: string): Promise<TitleDetail> => {
    const state = await ensureHydrated();
    const item = state.titles[titleId];
    if (!item) throw new ApiError(404, 'Title not found');
    await enrichTitleMetadata(item, item.title.name, provider, providerId);
    await saveState(state);
    return item;
  },

  getReviews: async (titleId: string): Promise<Review[]> => {
    const state = await ensureHydrated();
    return state.titles[titleId]?.reviews ?? [];
  },

  addReview: async (titleId: string, author: string, rating: number | null, text: string): Promise<Review> => {
    const state = await ensureHydrated();
    const item = state.titles[titleId];
    if (!item) throw new ApiError(404, 'Title not found');
    const review: Review = { author: author || 'You', rating, text, source: 'user' };
    item.reviews.unshift(review);
    await saveState(state);
    return review;
  },

  getProviders: async (titleId: string): Promise<Provider[]> => {
    const state = await ensureHydrated();
    return state.titles[titleId]?.providers ?? [];
  },

  updateProviders: async (titleId: string, providers: Provider[]): Promise<Provider[]> => {
    const state = await ensureHydrated();
    const item = state.titles[titleId];
    if (!item) throw new ApiError(404, 'Title not found');
    item.providers = providers;
    await saveState(state);
    return providers;
  },

  episodeStreamUrl: (episodeId: string): string => {
    return streamUrls.get(episodeId) || '';
  },

  getSubtitles: async (episodeId: string): Promise<SubtitleTrack[]> => {
    await ensureHydrated();
    return subtitleTracks.get(episodeId) ?? [];
  },
};
