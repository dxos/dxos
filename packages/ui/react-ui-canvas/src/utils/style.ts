//
// Copyright 2026 DXOS.org
//

//
// The frame classes a node's `style` resolves to. Tailwind only emits classes it can read verbatim, so
// every hue is spelled out here rather than composed from the hue name.
//

import { type Node } from '../model/types.ts';

export type HueClasses = { surface: string; text: string; border: string };

const HUES: Record<string, HueClasses> = {
  neutral: { surface: 'bg-neutral-surface', text: 'text-neutral-fg', border: 'border-neutral-border' },
  red: { surface: 'bg-red-surface', text: 'text-red-fg', border: 'border-red-border' },
  orange: { surface: 'bg-orange-surface', text: 'text-orange-fg', border: 'border-orange-border' },
  amber: { surface: 'bg-amber-surface', text: 'text-amber-fg', border: 'border-amber-border' },
  yellow: { surface: 'bg-yellow-surface', text: 'text-yellow-fg', border: 'border-yellow-border' },
  lime: { surface: 'bg-lime-surface', text: 'text-lime-fg', border: 'border-lime-border' },
  green: { surface: 'bg-green-surface', text: 'text-green-fg', border: 'border-green-border' },
  emerald: { surface: 'bg-emerald-surface', text: 'text-emerald-fg', border: 'border-emerald-border' },
  teal: { surface: 'bg-teal-surface', text: 'text-teal-fg', border: 'border-teal-border' },
  cyan: { surface: 'bg-cyan-surface', text: 'text-cyan-fg', border: 'border-cyan-border' },
  sky: { surface: 'bg-sky-surface', text: 'text-sky-fg', border: 'border-sky-border' },
  blue: { surface: 'bg-blue-surface', text: 'text-blue-fg', border: 'border-blue-border' },
  indigo: { surface: 'bg-indigo-surface', text: 'text-indigo-fg', border: 'border-indigo-border' },
  violet: { surface: 'bg-violet-surface', text: 'text-violet-fg', border: 'border-violet-border' },
  purple: { surface: 'bg-purple-surface', text: 'text-purple-fg', border: 'border-purple-border' },
  fuchsia: { surface: 'bg-fuchsia-surface', text: 'text-fuchsia-fg', border: 'border-fuchsia-border' },
  pink: { surface: 'bg-pink-surface', text: 'text-pink-fg', border: 'border-pink-border' },
  rose: { surface: 'bg-rose-surface', text: 'text-rose-fg', border: 'border-rose-border' },
};

/** The default look: the base surface, the base text and the separator border. */
const DEFAULT: HueClasses = { surface: 'bg-base-surface', text: '', border: 'border-separator' };

export const hueClasses = (hue: string | undefined): HueClasses => (hue && HUES[hue]) || DEFAULT;

/** Frame classes for a node: fill and text colour, border and corner radius from its style. */
export const frameClasses = (node: Node, selected: boolean): string[] => {
  const style = node.style ?? {};
  const hue = hueClasses(style.hue);
  return [
    style.fill === false ? '' : hue.surface,
    hue.text,
    style.border === false && !selected ? 'border-transparent' : selected ? 'border-primary-500' : hue.border,
    node.type === 'ellipse' ? 'rounded-[50%]' : style.rounded ? 'rounded-2xl' : 'rounded-sm',
  ];
};
