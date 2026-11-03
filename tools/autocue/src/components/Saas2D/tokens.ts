//
// Copyright 2026 DXOS.org
//

// Port of the DXOS neumorphic design tokens from the dxos/studio repo (`assets/tokens.mjs`, branch
// `claude/saas-60s-spike`); keep the math in step with it rather than tuning values here.

/** Brand neutrals (dxos.org) and accents (assets/brand). */
export const PALETTE = {
  black: '#020202',
  darker: '#1b1b1e',
  graphite: '#1d1f20',
  mid: '#42424b',
  dark: '#999999',
  mist: '#e6e9eb',
  lightest: '#eeeeee',
  white: '#ffffff',
  blue: '#2d6fff',
  cyan: '#06c5fd',
  turquoise: '#1fbfd5',
  green: '#1fd58a',
  purple: '#d83eff',
  pink: '#fb44b2',
  gold: '#f2c14e',
} as const;

export type PaletteColor = keyof typeof PALETTE;

/** Role colors: who a thing belongs to. */
export const ROLES = {
  team: PALETTE.blue,
  data: PALETTE.gold,
  lab: PALETTE.purple,
  agent: PALETTE.green,
} as const;

export type Role = keyof typeof ROLES;

/** Sharp Sans is reserved for the logotype; headings and body use DM Sans, labels and code DM Mono. */
export const FONTS = {
  sans: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', ui-monospace, monospace",
  logotype: "'Sharp Sans', 'DM Sans', sans-serif",
} as const;

type NeuTheme = {
  hue: number;
  sat: number;
  light: number;
  dist: number;
  blur: number;
  hi: number;
  lo: number;
  accent: PaletteColor;
};

/** The neumorphic system's defaults; light and dark are tuned separately. */
export const NEU: {
  angle: number;
  radius: number;
  glow: number;
  ease: [number, number, number, number];
  dur: number;
  themes: { light: NeuTheme; dark: NeuTheme };
} = {
  angle: 225,
  radius: 16,
  glow: 35,
  ease: [0.22, 1, 0.36, 1],
  dur: 220,
  themes: {
    light: { hue: 220, sat: 14, light: 91, dist: 8, blur: 2, hi: 90, lo: 32, accent: 'blue' },
    dark: { hue: 220, sat: 10, light: 15, dist: 7, blur: 2, hi: 9, lo: 70, accent: 'cyan' },
  },
};

export type Rgb = [number, number, number];

export const hsl = (h: number, s: number, l: number, a = 1) => `hsl(${h} ${s}% ${l}%${a < 1 ? ` / ${a}` : ''})`;

export const hslToRgb = (h: number, s: number, l: number): Rgb => {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

export const hexRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const relLum = ([r, g, b]: Rgb) => {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

/** WCAG contrast ratio of two colors. */
export const contrast = (a: Rgb, b: Rgb) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export type ShadowKind = 'raised' | 'inset';

/**
 * The neumorphic tokens for `light` or `dark` (flat finish, high-contrast text), as values rather than CSS variables.
 * `shadow(kind, dist)` scales the raised/inset shadows to any depth, keeping the light direction and softness.
 */
export const neuTokens = (name: 'light' | 'dark') => {
  const t = NEU.themes[name];
  const dark = name === 'dark';
  const hiCol = dark
    ? hsl(t.hue, t.sat, Math.min(100, t.light + 14), (t.hi / 100) * 4)
    : hsl(t.hue, Math.max(0, t.sat - 6), 100, t.hi / 100);
  const loCol = dark
    ? hsl(t.hue, t.sat + 10, Math.max(0, t.light - 12), t.lo / 100)
    : hsl(t.hue, t.sat + 8, Math.max(0, t.light - 34), t.lo / 100);
  const rad = ((NEU.angle + 180) * Math.PI) / 180;
  const shadow = (kind: ShadowKind, dist = t.dist) => {
    const dx = +(Math.cos(rad) * dist).toFixed(1);
    const dy = +(Math.sin(rad) * dist).toFixed(1);
    const blur = Math.round(dist * t.blur);
    return kind === 'inset'
      ? `inset ${dx}px ${dy}px ${blur}px ${loCol}, inset ${-dx}px ${-dy}px ${blur}px ${hiCol}`
      : `${-dx}px ${-dy}px ${blur}px ${hiCol}, ${dx}px ${dy}px ${blur}px ${loCol}`;
  };
  const accent = PALETTE[t.accent];
  const accentRgb = hexRgb(accent);
  const fgL = dark ? 96 : 10;
  const mutedL = dark ? 68 : 36;
  const g = NEU.glow / 100;
  return {
    bg: hsl(t.hue, t.sat, t.light),
    bgRgb: hslToRgb(t.hue, t.sat, t.light),
    lighter: hsl(t.hue, t.sat, Math.min(100, t.light + (dark ? 2.5 : 3))),
    darker: hsl(t.hue, t.sat, Math.max(0, t.light - (dark ? 3 : 4))),
    fg: hsl(t.hue, Math.min(t.sat, 20), fgL),
    fgRgb: hslToRgb(t.hue, Math.min(t.sat, 20), fgL),
    muted: hsl(t.hue, Math.min(t.sat, 14), mutedL),
    mutedRgb: hslToRgb(t.hue, Math.min(t.sat, 14), mutedL),
    hairline: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    highlight: hiCol,
    lowlight: loCol,
    accent,
    onAccent: contrast(accentRgb, [255, 255, 255]) >= contrast(accentRgb, [2, 2, 2]) ? '#ffffff' : '#020202',
    radius: NEU.radius,
    raised: shadow('raised'),
    raisedSm: shadow('raised', t.dist / 2),
    inset: shadow('inset'),
    insetSm: shadow('inset', t.dist / 2),
    glow: `0 0 ${Math.round(8 + 20 * g)}px color-mix(in srgb, ${accent} ${Math.round(g * 70)}%, transparent)`,
    shadow,
  };
};

export type NeuTokens = ReturnType<typeof neuTokens>;
