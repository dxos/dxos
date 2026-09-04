//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Ir from './Ir';

/**
 * Archify's classic preset, transcribed from `archify/assets/template.html`. Colours are literal
 * rather than theme tokens on purpose: the seven component roles and four relationship variants
 * are a fixed semantic vocabulary — a reader who learns "violet means storage" in one diagram must
 * read the next one the same way, so they cannot follow a workspace accent hue.
 */
export type Swatch = { fill: string; stroke: string };

export type Palette = {
  grid: string;
  text: string;
  textMuted: string;
  textDim: string;
  /** Opaque colour painted behind translucent component fills so routes do not show through. */
  mask: string;
  arrow: string;
  arrowEmphasis: string;
  lane: Swatch;
  component: Record<Ir.ComponentType, Swatch>;
  dot: Record<Ir.DotColor, string>;
};

const DARK: Palette = {
  grid: '#1e293b',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  mask: '#0f172a',
  arrow: '#64748b',
  arrowEmphasis: '#34d399',
  lane: { fill: 'rgba(15, 23, 42, 0.22)', stroke: '#334155' },
  component: {
    frontend: { fill: 'rgba(8, 51, 68, 0.4)', stroke: '#22d3ee' },
    backend: { fill: 'rgba(6, 78, 59, 0.4)', stroke: '#34d399' },
    database: { fill: 'rgba(76, 29, 149, 0.4)', stroke: '#a78bfa' },
    cloud: { fill: 'rgba(120, 53, 15, 0.3)', stroke: '#fbbf24' },
    security: { fill: 'rgba(136, 19, 55, 0.4)', stroke: '#fb7185' },
    messagebus: { fill: 'rgba(251, 146, 60, 0.3)', stroke: '#fb923c' },
    external: { fill: 'rgba(30, 41, 59, 0.5)', stroke: '#94a3b8' },
  },
  dot: {
    cyan: '#22d3ee',
    emerald: '#34d399',
    violet: '#a78bfa',
    amber: '#fbbf24',
    rose: '#fb7185',
    orange: '#fb923c',
    slate: '#94a3b8',
  },
};

const LIGHT: Palette = {
  grid: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  textDim: '#94a3b8',
  mask: '#ffffff',
  arrow: '#94a3b8',
  arrowEmphasis: '#059669',
  lane: { fill: 'rgba(248, 250, 252, 0.65)', stroke: '#cbd5e1' },
  component: {
    frontend: { fill: 'rgba(34, 211, 238, 0.15)', stroke: '#0891b2' },
    backend: { fill: 'rgba(52, 211, 153, 0.18)', stroke: '#059669' },
    database: { fill: 'rgba(167, 139, 250, 0.2)', stroke: '#7c3aed' },
    cloud: { fill: 'rgba(251, 191, 36, 0.18)', stroke: '#d97706' },
    security: { fill: 'rgba(251, 113, 133, 0.15)', stroke: '#e11d48' },
    messagebus: { fill: 'rgba(251, 146, 60, 0.15)', stroke: '#ea580c' },
    external: { fill: 'rgba(148, 163, 184, 0.18)', stroke: '#64748b' },
  },
  dot: {
    cyan: '#0891b2',
    emerald: '#059669',
    violet: '#7c3aed',
    amber: '#d97706',
    rose: '#e11d48',
    orange: '#ea580c',
    slate: '#64748b',
  },
};

export const paletteFor = (themeMode: 'dark' | 'light'): Palette => (themeMode === 'dark' ? DARK : LIGHT);

/** Stroke colour, dash pattern and width for each relationship variant. */
export const connectionStyle = (palette: Palette, variant: Ir.Variant = 'default', width?: number) => {
  switch (variant) {
    case 'emphasis':
      return { stroke: palette.arrowEmphasis, dash: undefined, width: width ?? 2 };
    case 'security':
      return { stroke: palette.component.security.stroke, dash: undefined, width: width ?? 1.5 };
    case 'dashed':
      return { stroke: palette.component.messagebus.stroke, dash: '6 4', width: width ?? 1.5 };
    default:
      return { stroke: palette.arrow, dash: undefined, width: width ?? 1.5 };
  }
};

/** Edge labels take the variant's accent so the label reads as part of the relationship. */
export const labelColor = (palette: Palette, variant: Ir.Variant = 'default'): string =>
  connectionStyle(palette, variant).stroke === palette.arrow
    ? palette.textMuted
    : connectionStyle(palette, variant).stroke;

export const LEGEND_LABELS: Record<Ir.ComponentType, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Data store',
  cloud: 'Cloud service',
  security: 'Security',
  messagebus: 'Message bus',
  external: 'External',
};
