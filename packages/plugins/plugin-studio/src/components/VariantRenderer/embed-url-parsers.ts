//
// Copyright 2026 DXOS.org
//

/** Maps a parsed video URL to an embeddable iframe URL, or `undefined` if the parser does not apply. */
export type EmbedUrlParser = (parsed: URL, host: string, start?: number) => string | undefined;

/** YouTube watch, short, and embed URLs. */
export const parseYouTubeEmbedUrl: EmbedUrlParser = (parsed, host, start) => {
  const youTubeId =
    host === 'youtu.be'
      ? parsed.pathname.slice(1)
      : (host === 'youtube.com' || host === 'm.youtube.com') && !parsed.pathname.startsWith('/embed/')
        ? parsed.searchParams.get('v')
        : undefined;
  if (youTubeId) {
    const params = new URLSearchParams();
    if (start !== undefined) {
      params.set('start', String(start));
      params.set('autoplay', '1');
    }
    const query = params.toString();
    return `https://www.youtube.com/embed/${youTubeId}${query ? `?${query}` : ''}`;
  }

  if ((host === 'youtube.com' || host === 'm.youtube.com') && parsed.pathname.startsWith('/embed/')) {
    if (start !== undefined) {
      parsed.searchParams.set('start', String(start));
      parsed.searchParams.set('autoplay', '1');
    }
    return parsed.toString();
  }

  return undefined;
};

/** Vimeo page and player URLs. */
export const parseVimeoEmbedUrl: EmbedUrlParser = (parsed, host, start) => {
  const vimeoId = host === 'vimeo.com' ? parsed.pathname.split('/').filter(Boolean)[0] : undefined;
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}${start !== undefined ? `?autoplay=1#t=${start}s` : ''}`;
  }

  if (host === 'player.vimeo.com') {
    if (start !== undefined) {
      parsed.searchParams.set('autoplay', '1');
      parsed.hash = `#t=${start}s`;
    }
    return parsed.toString();
  }

  return undefined;
};

/** Provider parsers tried in order before falling back to the raw URL. */
export const embedUrlParsers: EmbedUrlParser[] = [parseYouTubeEmbedUrl, parseVimeoEmbedUrl];

/**
 * Maps a video URL to an embeddable iframe URL. Tries each provider parser in
 * {@link embedUrlParsers}; returns the original URL for safe http(s) sources. When `startTime`
 * (seconds) is set, the embed starts at that offset and autoplays. Vendored from plugin-video.
 */
export const toEmbedUrl = (url: string, startTime?: number): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  const start = startTime != null && Number.isFinite(startTime) ? Math.max(0, Math.floor(startTime)) : undefined;

  for (const parser of embedUrlParsers) {
    const embedUrl = parser(parsed, host, start);
    if (embedUrl !== undefined) {
      return embedUrl;
    }
  }

  // Only fall back for safe http/https URLs; non-http schemes (data:, javascript:, …) are rejected.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return undefined;
  }
  if (start !== undefined) {
    parsed.hash = `#t=${start}`;
  }
  return parsed.toString();
};
