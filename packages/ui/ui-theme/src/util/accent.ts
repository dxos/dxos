//
// Copyright 2026 DXOS.org
//

import { type ChromaticPalette, hues } from '@dxos/ui-types';

/** The hues the accent can take: the theme's chromatic palette, each with a full Tailwind scale. */
export const ACCENT_HUES: readonly ChromaticPalette[] = hues;

export type AccentHue = ChromaticPalette;

/** The accent role tokens, derived from one hue the way `roles.css` derives them from blue. */
export const accentTokens = (hue: AccentHue): Record<string, string> => ({
  '--color-accent-bg': `light-dark(var(--color-${hue}-600), var(--color-${hue}-700))`,
  '--color-accent-bg-hover': `light-dark(var(--color-${hue}-700), var(--color-${hue}-800))`,
  '--color-accent-fg': `var(--color-${hue}-100)`,
  '--color-accent-text': `light-dark(var(--color-${hue}-600), var(--color-${hue}-400))`,
  '--color-accent-text-hover': `var(--color-${hue}-500)`,
});

/**
 * Sets the accent for an element's subtree — the document root for the whole app — or clears it back
 * to the stylesheet's default when `hue` is undefined.
 */
export const applyAccent = (element: HTMLElement, hue: AccentHue | undefined): void => {
  const tokens = accentTokens(hue ?? ACCENT_HUES[0]);
  for (const [name, value] of Object.entries(tokens)) {
    if (hue) {
      element.style.setProperty(name, value);
    } else {
      element.style.removeProperty(name);
    }
  }
};
