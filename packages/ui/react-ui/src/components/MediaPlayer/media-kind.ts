//
// Copyright 2026 DXOS.org
//

// Kept out of `MediaPlayer.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type MediaKind = 'video' | 'audio';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov', '.m4v'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

/**
 * Best-effort detection of `video` vs `audio` from a media URL.
 * Inspects the pathname's extension (ignoring query/hash). Returns `undefined`
 * when the URL doesn't look like a recognised media file — callers should
 * default to 'video' or render a fallback (e.g. iframe / img).
 */
export const detectMediaKind = (src: string): MediaKind | undefined => {
  // Strip query and hash, then take the last path segment's extension.
  const pathname = src.split(/[?#]/, 1)[0]!;
  const lower = pathname.toLowerCase();
  if (VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return 'audio';
  }

  return undefined;
};

/**
 * Heuristic match for URLs that should render as native `<video>` / `<audio>`
 * (i.e. URLs ending in a recognised media extension).
 *
 * NB: Cloudflare Stream embed URLs serve an HTML player page, **not** a media
 * stream, so they cannot be loaded via `<video>`. Those are detected by
 * {@link isCloudflareStreamEmbed} and rendered via `<iframe>` instead.
 */
export const isEmbedUrl = (src: string): boolean => detectMediaKind(src) !== undefined;
