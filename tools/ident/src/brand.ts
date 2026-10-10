// Everything that should look the same in every spot lives here.
// Change a value once and every rendered video follows.

export const FPS = 30;

export const COLORS = {
  ground: '#050505', // background
  main: '#FFFFFF', // provocation type and the mark
  second: '#F2F2F2', // tagline and secondary text
  accent: '#5B8CFF', // used once per spot: the rule under the tagline
};

// Sharp Sans Display No1 Medium, loaded from public/fonts (see src/fonts.ts).
export const FONT_FAMILY = 'Sharp Sans Display';
export const FONT_STACK = `"${FONT_FAMILY}", "Helvetica Neue", Arial, sans-serif`;
export const MONO_STACK = '"JetBrains Mono", "SF Mono", Menlo, monospace';

export const END_CARD = {
  // Logo lockup (copied from studio/assets/logotypes). Set markSrc to null to fall back to markText.
  markSrc: 'brand/dxos-horizontal-white.svg' as string | null,
  markHeight: 340, // px at 1080p; the SVG has generous padding in its viewBox
  markText: 'DXOS',
  tagline: 'Sovereign Intelligence.',
  cta: 'Join the community',
  url: 'dxos.org/discord',
};

// Timing, in seconds. These are the beat sheets from the Video Ad Template spec.
export const TIMING = {
  wordStep: 0.32, // gap between words appearing
  lineGap: 0.5, // pause between one line finishing and the next starting
  open: { duration: 3, fadeIn: 1.5 }, // opening title: logotype fades in, then holds
  trail: { duration: 8 }, // DXOS trail: fluid glow orbiting the mark
  spot10: { provocation: 7, cutToBlack: 5.6, endCard: 3 },
  spot30: {
    provocation: 12,
    provocationCut: 9,
    turn: 10,
    turnCut: 9.6,
    resolve: 4,
    resolveCut: 3.8,
    endCard: 4,
  },
};

export type FormatId = '16x9' | '9x16' | '1x1' | '4x5';

export const FORMATS: Record<FormatId, { width: number; height: number }> = {
  '16x9': { width: 1920, height: 1080 },
  '9x16': { width: 1080, height: 1920 },
  '1x1': { width: 1080, height: 1080 },
  '4x5': { width: 1080, height: 1350 },
};

export const DEFAULT_TURN = ['Your data.', 'Your devices.', 'Your rules.'];
