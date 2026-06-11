//
// Copyright 2026 DXOS.org
//

// Caps the prompt size sent to the model; long pages carry most of their signal up front.
const MAX_LENGTH = 40_000;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Extract the readable text from a page's HTML for summarization: strips script/style/noscript
 * blocks and comments, removes the remaining tags, decodes basic entities, collapses whitespace,
 * and caps the length. A regex-based approximation (not a DOM parse) so it stays pure and usable
 * outside the browser.
 */
export const extractReadableText = (html: string): string => {
  const withoutBlocks = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const withoutTags = withoutBlocks.replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#(?:[xX][0-9a-fA-F]+|\d+)|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const code =
        entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      // Guard against surrogate halves and out-of-range code points, which `fromCodePoint` rejects.
      const valid = Number.isFinite(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
      return valid ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
