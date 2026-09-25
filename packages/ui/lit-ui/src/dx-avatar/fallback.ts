//
// Copyright 2026 DXOS.org
//

const getInitials = (label = ''): string[] =>
  label
    .trim()
    .split(/\s+/)
    .map((str) => str.replace(/[^\p{L}\p{N}\s]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase());

export const getFallbackGlyph = (fallback = ''): string => {
  const initials = getInitials(fallback);
  return initials.length > 0 ? initials.join('') : fallback;
};
