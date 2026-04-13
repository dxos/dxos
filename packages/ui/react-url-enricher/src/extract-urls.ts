//
// Copyright 2026 DXOS.org
//

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

/**
 * Extract up to `limit` URLs from a blob of text, de-duplicated, in order of
 * appearance. Trailing punctuation that prose often glues to URLs is stripped.
 */
export const extractUrls = (text: string, limit = 5): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];
  const matches = text.match(URL_REGEX) ?? [];
  for (const match of matches) {
    const cleaned = match.replace(/[.,;:!?)"']+$/, '');
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      urls.push(cleaned);
      if (urls.length >= limit) {
        break;
      }
    }
  }
  return urls;
};
