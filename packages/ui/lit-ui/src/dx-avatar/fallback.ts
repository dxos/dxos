//
// Copyright 2026 DXOS.org
//

/**
 * Returns the first two renderable characters from a string that are separated by non-word characters.
 * Handles Unicode characters correctly.
 */
const getInitials = (label = ''): string[] =>
  label
    .trim()
    .split(/\s+/)
    .map((str) => str.replace(/[^\p{L}\p{N}\s]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase());

/**
 * Glyph rendered inside an avatar for a `fallback` string: initials for a label, or the string
 * itself when it holds nothing to initialise. Emoji are recognised by that absence rather than by
 * `\p{Emoji_Presentation}`, which rejects the text-presentation emoji that rely on U+FE0F (☀️, ⚙️,
 * ♻️ …) and left them initialising to an empty glyph — a coloured avatar with no symbol.
 */
export const getFallbackGlyph = (fallback = ''): string => {
  const initials = getInitials(fallback);
  return initials.length > 0 ? initials.join('') : fallback;
};
