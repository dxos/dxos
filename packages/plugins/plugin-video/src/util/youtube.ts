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

/** Safely walk a nested path on untyped JSON, returning the leaf only when it is a non-empty string. */
const readString = (value: unknown, path: readonly string[]): string | undefined => {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    // Untyped external JSON: index access is safe here after the object/null guard above.
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' && current.length > 0 ? current : undefined;
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
