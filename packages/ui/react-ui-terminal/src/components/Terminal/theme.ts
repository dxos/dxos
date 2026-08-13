//
// Copyright 2026 DXOS.org
//

import type { ITheme } from '@xterm/xterm';

/**
 * ANSI slots mapped onto the design system's semantic hues. The theme carries one text weight per
 * hue, so a bright slot reuses its base token rather than inventing a second shade; the neutral
 * slots step through the greys so dim output stays legible against the surface.
 */
const ANSI_TOKENS = {
  black: '--color-subdued',
  red: '--color-red-text',
  green: '--color-green-text',
  yellow: '--color-yellow-text',
  blue: '--color-blue-text',
  magenta: '--color-fuchsia-text',
  cyan: '--color-cyan-text',
  white: '--color-description',
  brightBlack: '--color-description',
  brightRed: '--color-red-text',
  brightGreen: '--color-green-text',
  brightYellow: '--color-yellow-text',
  brightBlue: '--color-blue-text',
  brightMagenta: '--color-fuchsia-text',
  brightCyan: '--color-cyan-text',
  brightWhite: '--color-base-fg',
} as const;

/**
 * Resolves design system color tokens to the hex form xterm's parser accepts.
 *
 * Two steps, because neither alone suffices: a probe element inside the token scope turns
 * `light-dark(var(…))` into an absolute computed color, then a canvas rasterizes that color — which
 * the theme states in `oklch()` — down to sRGB channels.
 */
const makeResolver = (scope: Element) => {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  scope.appendChild(probe);

  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  const resolve = (token: string): string | undefined => {
    probe.style.color = `var(${token})`;
    const computed = getComputedStyle(probe).color;
    if (!context || computed.length === 0) {
      return undefined;
    }

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = computed;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
    return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  };

  return { resolve, dispose: () => probe.remove() };
};

/**
 * Builds an xterm theme from the design system tokens in scope at `element`, so the terminal
 * follows light/dark and any theme override rather than carrying its own palette.
 */
export const createXtermTheme = (element: Element): ITheme => {
  const { resolve, dispose } = makeResolver(element);
  try {
    const surface = resolve('--color-base-surface');
    const foreground = resolve('--color-base-fg');
    const ansi = Object.fromEntries(Object.entries(ANSI_TOKENS).map(([slot, token]) => [slot, resolve(token)])) as Pick<
      ITheme,
      keyof typeof ANSI_TOKENS
    >;

    return {
      background: surface,
      foreground,
      cursor: foreground,
      cursorAccent: surface,
      selectionBackground: resolve('--color-accent-surface'),
      ...ansi,
    };
  } finally {
    dispose();
  }
};
