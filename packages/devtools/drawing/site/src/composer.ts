//
// Copyright 2026 DXOS.org
//

/**
 * Where "Open in Composer" will go: the drawing app imports the `.dx.svg` at `src` onto a canvas.
 * TODO(drawing): Enable once the Composer API gate opens for app.drawing.sh; until then the link is shown disabled.
 */
export const OPEN_IN_COMPOSER = {
  enabled: false,
  url: (src: string) => `https://app.drawing.sh/?src=${encodeURIComponent(src)}`,
} as const;
