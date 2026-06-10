//
// Copyright 2026 DXOS.org
//

/**
 * Extract the full published description from a YouTube watch page's HTML.
 *
 * YouTube embeds the complete description in the `ytInitialPlayerResponse` JSON blob it ships in the
 * initial server response (so the page JS does not need to execute). We prefer the full
 * `videoDetails.shortDescription`, fall back to the microformat description, and finally to the
 * (truncated) `og:description` meta tag.
 */
export const parseYouTubeDescription = (html: string): string | undefined => {
  const player = extractJsonAfter(html, 'ytInitialPlayerResponse');
  return (
    readString(player, ['videoDetails', 'shortDescription']) ??
    readString(player, ['microformat', 'playerMicroformatRenderer', 'description', 'simpleText']) ??
    parseOgDescription(html)
  );
};

/** A caption track advertised by a YouTube watch page. */
export type CaptionTrack = {
  /** Timed-text endpoint that returns the captions (already signed by YouTube). */
  baseUrl: string;
  /** BCP-47 language code, e.g. `en`, `en-US`. */
  languageCode?: string;
  /** `asr` for auto-generated (speech-recognition) tracks; absent for human-authored captions. */
  kind?: string;
  /** Human-readable track name, e.g. `English`. */
  name?: string;
};

/**
 * Extract the caption tracks advertised by a YouTube watch page.
 *
 * The tracks (including the signed timed-text `baseUrl` for each) live in the same
 * `ytInitialPlayerResponse` blob that carries the description, under
 * `captions.playerCaptionsTracklistRenderer.captionTracks`. Returns `[]` when the video publishes no
 * captions (or the blob is absent).
 */
export const parseYouTubeCaptionTracks = (html: string): CaptionTrack[] => {
  const player = extractJsonAfter(html, 'ytInitialPlayerResponse');
  const raw = readValue(player, ['captions', 'playerCaptionsTracklistRenderer', 'captionTracks']);
  if (!Array.isArray(raw)) {
    return [];
  }

  const tracks: CaptionTrack[] = [];
  for (const entry of raw) {
    const baseUrl = readString(entry, ['baseUrl']);
    if (!baseUrl) {
      continue;
    }
    tracks.push({
      baseUrl,
      languageCode: readString(entry, ['languageCode']),
      kind: readString(entry, ['kind']),
      name: readString(entry, ['name', 'simpleText']) ?? readString(entry, ['name', 'runs', '0', 'text']),
    });
  }
  return tracks;
};

/**
 * Choose the best caption track for a preferred language: an exact (or primary-subtag) language match
 * preferring human-authored over auto-generated (`asr`), then any language match, then any
 * human-authored track, finally the first available.
 */
export const selectCaptionTrack = (tracks: readonly CaptionTrack[], lang: string): CaptionTrack | undefined => {
  const matchesLang = (track: CaptionTrack): boolean =>
    track.languageCode === lang || track.languageCode?.split('-')[0] === lang;
  const isManual = (track: CaptionTrack): boolean => track.kind !== 'asr';

  return (
    tracks.find((track) => matchesLang(track) && isManual(track)) ??
    tracks.find(matchesLang) ??
    tracks.find(isManual) ??
    tracks[0]
  );
};

/** A single caption cue. */
export type TranscriptSegment = {
  /** Start offset in seconds. */
  start: number;
  /** Cue text (HTML-entity decoded, whitespace-collapsed). */
  text: string;
};

/**
 * Parse YouTube's timed-text caption XML (`<transcript><text start="0" dur="1.5">…</text>…`) into
 * ordered segments. Empty or untimed cues are skipped.
 */
export const parseTimedText = (xml: string): TranscriptSegment[] => {
  const segments: TranscriptSegment[] = [];
  const cueRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;
  while ((match = cueRe.exec(xml))) {
    const start = Number(/\bstart="([^"]*)"/.exec(match[1])?.[1] ?? 'NaN');
    const text = decodeHtmlEntities(match[2].replace(/\s+/g, ' ').trim());
    if (!Number.isFinite(start) || text.length === 0) {
      continue;
    }
    segments.push({ start, text });
  }
  return segments;
};

/**
 * Format caption segments into the plugin's transcript markdown: one segment per line, each prefixed
 * with a `[m:ss](url?t=Ns)` timestamp link. This matches the format `decorateTranscript` expects (it
 * hides the inline link and renders a seek chip in the gutter), so a caption-derived transcript reads
 * identically to an EDGE-generated one.
 */
export const formatTranscriptMarkdown = (segments: readonly TranscriptSegment[], url: string): string =>
  segments
    .map((segment) => `[${formatTimestamp(segment.start)}](${withTimestamp(url, segment.start)}) ${segment.text}`)
    .join('\n');

const withTimestamp = (url: string, seconds: number): string => {
  const offset = Math.floor(seconds);
  return `${url}${url.includes('?') ? '&' : '?'}t=${offset}s`;
};

const formatTimestamp = (seconds: number): string => {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(secs).padStart(2, '0')}`;
};

/**
 * Read the `og:description` meta tag content (HTML-entity decoded). This is the short, truncated
 * description but is a reliable last-resort fallback.
 */
const parseOgDescription = (html: string): string | undefined => {
  const match =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  const content = match?.[1];
  return content ? decodeHtmlEntities(content) : undefined;
};

/**
 * Locate `<marker> = {` in the source and return the parsed JSON object by balancing braces while
 * respecting string literals and escapes. Returns `undefined` if the marker or a valid object is
 * not found.
 */
const extractJsonAfter = (source: string, marker: string): unknown => {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }
  const start = source.indexOf('{', markerIndex);
  if (start === -1) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1));
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
};

/** Safely walk a nested path on untyped JSON (object keys or array indices), returning the leaf value. */
const readValue = (value: unknown, path: readonly string[]): unknown => {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    // Untyped external JSON: index access is safe here after the object/null guard above.
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

/** Walk a nested path, returning the leaf only when it is a non-empty string. */
const readString = (value: unknown, path: readonly string[]): string | undefined => {
  const result = readValue(value, path);
  return typeof result === 'string' && result.length > 0 ? result : undefined;
};

const decodeCodePoint = (code: number): string => {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
};

// Numeric entities are decoded first; named `&amp;` is decoded last so a single pass cannot
// re-introduce an entity it already produced.
const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => decodeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => decodeCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
