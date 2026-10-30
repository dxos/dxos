//
// Copyright 2026 DXOS.org
//

//
// The literal classes each style set token draws with, per look tone. Tailwind only emits classes it reads verbatim,
// so every class is spelled out; the `theme` variant pairs the light classes with `dark:` ones so it follows the app.
//

import { type StyleHue } from '@dxos/scene';

import { type LookTone, type NodeSurface, type Opacity, type Radius } from '../model/index.ts';

/** A surface's classes; `pressed` replaces `surface` while the shape is selected, for a surface that presses in. */
export type SurfaceClasses = { surface: string; text: string; border: string; pressed?: string };

type ByTone<T> = Record<LookTone, T>;

/** The surfaces a style set draws other than the canvas's own tones (`hueClasses`, in `style.ts`). */
export type SetSurface = Exclude<NodeSurface, 'hue-clear' | 'hue-strong' | 'hue-role' | 'hue-light'>;

/** Each surface's classes for a node with no hue (`default`) and for each picker hue. */
/** The softest muted fill; `muted-clear` takes its border and text with no fill. */
const MUTED_SUBTLE: Record<StyleHue | 'default', ByTone<SurfaceClasses>> = {
  default: {
    theme: {
      surface: 'bg-neutral-50 dark:bg-neutral-900',
      text: '',
      border: 'border-neutral-200 dark:border-neutral-800',
    },
    light: { surface: 'bg-neutral-50', text: 'text-neutral-900', border: 'border-neutral-200' },
    dark: { surface: 'bg-neutral-900', text: 'text-neutral-100', border: 'border-neutral-800' },
  },
  neutral: {
    theme: {
      surface: 'bg-neutral-50 dark:bg-neutral-900',
      text: 'text-neutral-900 dark:text-neutral-100',
      border: 'border-neutral-200 dark:border-neutral-800',
    },
    light: { surface: 'bg-neutral-50', text: 'text-neutral-900', border: 'border-neutral-200' },
    dark: { surface: 'bg-neutral-900', text: 'text-neutral-100', border: 'border-neutral-800' },
  },
  red: {
    theme: {
      surface: 'bg-red-50 dark:bg-red-950/50',
      text: 'text-red-900 dark:text-red-100',
      border: 'border-red-100 dark:border-red-900',
    },
    light: { surface: 'bg-red-50', text: 'text-red-900', border: 'border-red-100' },
    dark: { surface: 'bg-red-950/50', text: 'text-red-100', border: 'border-red-900' },
  },
  orange: {
    theme: {
      surface: 'bg-orange-50 dark:bg-orange-950/50',
      text: 'text-orange-900 dark:text-orange-100',
      border: 'border-orange-100 dark:border-orange-900',
    },
    light: { surface: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-100' },
    dark: { surface: 'bg-orange-950/50', text: 'text-orange-100', border: 'border-orange-900' },
  },
  amber: {
    theme: {
      surface: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-900 dark:text-amber-100',
      border: 'border-amber-100 dark:border-amber-900',
    },
    light: { surface: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-100' },
    dark: { surface: 'bg-amber-950/50', text: 'text-amber-100', border: 'border-amber-900' },
  },
  green: {
    theme: {
      surface: 'bg-green-50 dark:bg-green-950/50',
      text: 'text-green-900 dark:text-green-100',
      border: 'border-green-100 dark:border-green-900',
    },
    light: { surface: 'bg-green-50', text: 'text-green-900', border: 'border-green-100' },
    dark: { surface: 'bg-green-950/50', text: 'text-green-100', border: 'border-green-900' },
  },
  teal: {
    theme: {
      surface: 'bg-teal-50 dark:bg-teal-950/50',
      text: 'text-teal-900 dark:text-teal-100',
      border: 'border-teal-100 dark:border-teal-900',
    },
    light: { surface: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-100' },
    dark: { surface: 'bg-teal-950/50', text: 'text-teal-100', border: 'border-teal-900' },
  },
  sky: {
    theme: {
      surface: 'bg-sky-50 dark:bg-sky-950/50',
      text: 'text-sky-900 dark:text-sky-100',
      border: 'border-sky-100 dark:border-sky-900',
    },
    light: { surface: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-100' },
    dark: { surface: 'bg-sky-950/50', text: 'text-sky-100', border: 'border-sky-900' },
  },
  blue: {
    theme: {
      surface: 'bg-blue-50 dark:bg-blue-950/50',
      text: 'text-blue-900 dark:text-blue-100',
      border: 'border-blue-100 dark:border-blue-900',
    },
    light: { surface: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-100' },
    dark: { surface: 'bg-blue-950/50', text: 'text-blue-100', border: 'border-blue-900' },
  },
  violet: {
    theme: {
      surface: 'bg-violet-50 dark:bg-violet-950/50',
      text: 'text-violet-900 dark:text-violet-100',
      border: 'border-violet-100 dark:border-violet-900',
    },
    light: { surface: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-100' },
    dark: { surface: 'bg-violet-950/50', text: 'text-violet-100', border: 'border-violet-900' },
  },
};

/** A surface's border and text with no fill, so an unfilled tone keeps the edge of the tone above it. */
const withoutFill = (
  table: Record<StyleHue | 'default', ByTone<SurfaceClasses>>,
): Record<StyleHue | 'default', ByTone<SurfaceClasses>> => {
  const clear = (tones: ByTone<SurfaceClasses>): ByTone<SurfaceClasses> => ({
    theme: { ...tones.theme, surface: 'bg-transparent' },
    light: { ...tones.light, surface: 'bg-transparent' },
    dark: { ...tones.dark, surface: 'bg-transparent' },
  });
  return {
    default: clear(table.default),
    neutral: clear(table.neutral),
    red: clear(table.red),
    orange: clear(table.orange),
    amber: clear(table.amber),
    green: clear(table.green),
    teal: clear(table.teal),
    sky: clear(table.sky),
    blue: clear(table.blue),
    violet: clear(table.violet),
  };
};

/**
 * A soft shape's accent: its hue marks only the border and the label, since the shape itself is the ground. A shape with
 * no hue is pure relief, with no edge of its own.
 */
const SOFT_ACCENTS: Record<StyleHue | 'default', ByTone<{ text: string; border: string }>> = {
  default: {
    theme: { text: '', border: 'border-transparent' },
    light: { text: 'text-neutral-700', border: 'border-transparent' },
    dark: { text: 'text-neutral-200', border: 'border-transparent' },
  },
  neutral: {
    theme: {
      text: 'text-neutral-700 dark:text-neutral-300',
      border: 'border-neutral-500/45 dark:border-neutral-400/45',
    },
    light: { text: 'text-neutral-700', border: 'border-neutral-500/45' },
    dark: { text: 'text-neutral-300', border: 'border-neutral-400/45' },
  },
  red: {
    theme: { text: 'text-red-700 dark:text-red-300', border: 'border-red-500/45 dark:border-red-400/45' },
    light: { text: 'text-red-700', border: 'border-red-500/45' },
    dark: { text: 'text-red-300', border: 'border-red-400/45' },
  },
  orange: {
    theme: { text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500/45 dark:border-orange-400/45' },
    light: { text: 'text-orange-700', border: 'border-orange-500/45' },
    dark: { text: 'text-orange-300', border: 'border-orange-400/45' },
  },
  amber: {
    theme: { text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/45 dark:border-amber-400/45' },
    light: { text: 'text-amber-700', border: 'border-amber-500/45' },
    dark: { text: 'text-amber-300', border: 'border-amber-400/45' },
  },
  green: {
    theme: { text: 'text-green-700 dark:text-green-300', border: 'border-green-500/45 dark:border-green-400/45' },
    light: { text: 'text-green-700', border: 'border-green-500/45' },
    dark: { text: 'text-green-300', border: 'border-green-400/45' },
  },
  teal: {
    theme: { text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500/45 dark:border-teal-400/45' },
    light: { text: 'text-teal-700', border: 'border-teal-500/45' },
    dark: { text: 'text-teal-300', border: 'border-teal-400/45' },
  },
  sky: {
    theme: { text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-500/45 dark:border-sky-400/45' },
    light: { text: 'text-sky-700', border: 'border-sky-500/45' },
    dark: { text: 'text-sky-300', border: 'border-sky-400/45' },
  },
  blue: {
    theme: { text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/45 dark:border-blue-400/45' },
    light: { text: 'text-blue-700', border: 'border-blue-500/45' },
    dark: { text: 'text-blue-300', border: 'border-blue-400/45' },
  },
  violet: {
    theme: { text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-500/45 dark:border-violet-400/45' },
    light: { text: 'text-violet-700', border: 'border-violet-500/45' },
    dark: { text: 'text-violet-300', border: 'border-violet-400/45' },
  },
};

/** The soft accents over one relief: the same ground in every tone, as its `light-dark()` variables follow the scheme. */
const soft = (surface: string, pressed: string): Record<StyleHue | 'default', ByTone<SurfaceClasses>> => {
  const relief = (accent: ByTone<{ text: string; border: string }>): ByTone<SurfaceClasses> => ({
    theme: { ...accent.theme, surface, pressed },
    light: { ...accent.light, surface, pressed },
    dark: { ...accent.dark, surface, pressed },
  });
  return {
    default: relief(SOFT_ACCENTS.default),
    neutral: relief(SOFT_ACCENTS.neutral),
    red: relief(SOFT_ACCENTS.red),
    orange: relief(SOFT_ACCENTS.orange),
    amber: relief(SOFT_ACCENTS.amber),
    green: relief(SOFT_ACCENTS.green),
    teal: relief(SOFT_ACCENTS.teal),
    sky: relief(SOFT_ACCENTS.sky),
    blue: relief(SOFT_ACCENTS.blue),
    violet: relief(SOFT_ACCENTS.violet),
  };
};

export const SURFACES: Record<SetSurface, Record<StyleHue | 'default', ByTone<SurfaceClasses>>> = {
  'muted-subtle': MUTED_SUBTLE,
  'muted-clear': withoutFill(MUTED_SUBTLE),
  'muted': {
    default: {
      theme: {
        surface: 'bg-neutral-100 dark:bg-neutral-800',
        text: '',
        border: 'border-neutral-200 dark:border-neutral-700',
      },
      light: { surface: 'bg-neutral-100', text: 'text-neutral-900', border: 'border-neutral-200' },
      dark: { surface: 'bg-neutral-800', text: 'text-neutral-100', border: 'border-neutral-700' },
    },
    neutral: {
      theme: {
        surface: 'bg-neutral-200 dark:bg-neutral-700',
        text: 'text-neutral-900 dark:text-neutral-100',
        border: 'border-neutral-300 dark:border-neutral-600',
      },
      light: { surface: 'bg-neutral-200', text: 'text-neutral-900', border: 'border-neutral-300' },
      dark: { surface: 'bg-neutral-700', text: 'text-neutral-100', border: 'border-neutral-600' },
    },
    red: {
      theme: {
        surface: 'bg-red-100 dark:bg-red-950',
        text: 'text-red-900 dark:text-red-100',
        border: 'border-red-200 dark:border-red-800',
      },
      light: { surface: 'bg-red-100', text: 'text-red-900', border: 'border-red-200' },
      dark: { surface: 'bg-red-950', text: 'text-red-100', border: 'border-red-800' },
    },
    orange: {
      theme: {
        surface: 'bg-orange-100 dark:bg-orange-950',
        text: 'text-orange-900 dark:text-orange-100',
        border: 'border-orange-200 dark:border-orange-800',
      },
      light: { surface: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-200' },
      dark: { surface: 'bg-orange-950', text: 'text-orange-100', border: 'border-orange-800' },
    },
    amber: {
      theme: {
        surface: 'bg-amber-100 dark:bg-amber-950',
        text: 'text-amber-900 dark:text-amber-100',
        border: 'border-amber-200 dark:border-amber-800',
      },
      light: { surface: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-200' },
      dark: { surface: 'bg-amber-950', text: 'text-amber-100', border: 'border-amber-800' },
    },
    green: {
      theme: {
        surface: 'bg-green-100 dark:bg-green-950',
        text: 'text-green-900 dark:text-green-100',
        border: 'border-green-200 dark:border-green-800',
      },
      light: { surface: 'bg-green-100', text: 'text-green-900', border: 'border-green-200' },
      dark: { surface: 'bg-green-950', text: 'text-green-100', border: 'border-green-800' },
    },
    teal: {
      theme: {
        surface: 'bg-teal-100 dark:bg-teal-950',
        text: 'text-teal-900 dark:text-teal-100',
        border: 'border-teal-200 dark:border-teal-800',
      },
      light: { surface: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-200' },
      dark: { surface: 'bg-teal-950', text: 'text-teal-100', border: 'border-teal-800' },
    },
    sky: {
      theme: {
        surface: 'bg-sky-100 dark:bg-sky-950',
        text: 'text-sky-900 dark:text-sky-100',
        border: 'border-sky-200 dark:border-sky-800',
      },
      light: { surface: 'bg-sky-100', text: 'text-sky-900', border: 'border-sky-200' },
      dark: { surface: 'bg-sky-950', text: 'text-sky-100', border: 'border-sky-800' },
    },
    blue: {
      theme: {
        surface: 'bg-blue-100 dark:bg-blue-950',
        text: 'text-blue-900 dark:text-blue-100',
        border: 'border-blue-200 dark:border-blue-800',
      },
      light: { surface: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-200' },
      dark: { surface: 'bg-blue-950', text: 'text-blue-100', border: 'border-blue-800' },
    },
    violet: {
      theme: {
        surface: 'bg-violet-100 dark:bg-violet-950',
        text: 'text-violet-900 dark:text-violet-100',
        border: 'border-violet-200 dark:border-violet-800',
      },
      light: { surface: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-200' },
      dark: { surface: 'bg-violet-950', text: 'text-violet-100', border: 'border-violet-800' },
    },
  },
  'muted-solid': {
    default: {
      theme: {
        surface: 'bg-neutral-300 dark:bg-neutral-600',
        text: '',
        border: 'border-neutral-400 dark:border-neutral-500',
      },
      light: { surface: 'bg-neutral-300', text: 'text-neutral-900', border: 'border-neutral-400' },
      dark: { surface: 'bg-neutral-600', text: 'text-neutral-50', border: 'border-neutral-500' },
    },
    neutral: {
      theme: {
        surface: 'bg-neutral-300 dark:bg-neutral-800',
        text: 'text-neutral-900 dark:text-neutral-100',
        border: 'border-neutral-400 dark:border-neutral-700',
      },
      light: { surface: 'bg-neutral-300', text: 'text-neutral-900', border: 'border-neutral-400' },
      dark: { surface: 'bg-neutral-800', text: 'text-neutral-100', border: 'border-neutral-700' },
    },
    red: {
      theme: {
        surface: 'bg-red-300 dark:bg-red-800',
        text: 'text-red-900 dark:text-red-100',
        border: 'border-red-400 dark:border-red-700',
      },
      light: { surface: 'bg-red-300', text: 'text-red-900', border: 'border-red-400' },
      dark: { surface: 'bg-red-800', text: 'text-red-100', border: 'border-red-700' },
    },
    orange: {
      theme: {
        surface: 'bg-orange-300 dark:bg-orange-800',
        text: 'text-orange-900 dark:text-orange-100',
        border: 'border-orange-400 dark:border-orange-700',
      },
      light: { surface: 'bg-orange-300', text: 'text-orange-900', border: 'border-orange-400' },
      dark: { surface: 'bg-orange-800', text: 'text-orange-100', border: 'border-orange-700' },
    },
    amber: {
      theme: {
        surface: 'bg-amber-300 dark:bg-amber-800',
        text: 'text-amber-900 dark:text-amber-100',
        border: 'border-amber-400 dark:border-amber-700',
      },
      light: { surface: 'bg-amber-300', text: 'text-amber-900', border: 'border-amber-400' },
      dark: { surface: 'bg-amber-800', text: 'text-amber-100', border: 'border-amber-700' },
    },
    green: {
      theme: {
        surface: 'bg-green-300 dark:bg-green-800',
        text: 'text-green-900 dark:text-green-100',
        border: 'border-green-400 dark:border-green-700',
      },
      light: { surface: 'bg-green-300', text: 'text-green-900', border: 'border-green-400' },
      dark: { surface: 'bg-green-800', text: 'text-green-100', border: 'border-green-700' },
    },
    teal: {
      theme: {
        surface: 'bg-teal-300 dark:bg-teal-800',
        text: 'text-teal-900 dark:text-teal-100',
        border: 'border-teal-400 dark:border-teal-700',
      },
      light: { surface: 'bg-teal-300', text: 'text-teal-900', border: 'border-teal-400' },
      dark: { surface: 'bg-teal-800', text: 'text-teal-100', border: 'border-teal-700' },
    },
    sky: {
      theme: {
        surface: 'bg-sky-300 dark:bg-sky-800',
        text: 'text-sky-900 dark:text-sky-100',
        border: 'border-sky-400 dark:border-sky-700',
      },
      light: { surface: 'bg-sky-300', text: 'text-sky-900', border: 'border-sky-400' },
      dark: { surface: 'bg-sky-800', text: 'text-sky-100', border: 'border-sky-700' },
    },
    blue: {
      theme: {
        surface: 'bg-blue-300 dark:bg-blue-800',
        text: 'text-blue-900 dark:text-blue-100',
        border: 'border-blue-400 dark:border-blue-700',
      },
      light: { surface: 'bg-blue-300', text: 'text-blue-900', border: 'border-blue-400' },
      dark: { surface: 'bg-blue-800', text: 'text-blue-100', border: 'border-blue-700' },
    },
    violet: {
      theme: {
        surface: 'bg-violet-300 dark:bg-violet-800',
        text: 'text-violet-900 dark:text-violet-100',
        border: 'border-violet-400 dark:border-violet-700',
      },
      light: { surface: 'bg-violet-300', text: 'text-violet-900', border: 'border-violet-400' },
      dark: { surface: 'bg-violet-800', text: 'text-violet-100', border: 'border-violet-700' },
    },
  },
  'outline': {
    default: {
      theme: { surface: 'bg-transparent', text: '', border: 'border-neutral-400 dark:border-neutral-500' },
      light: { surface: 'bg-transparent', text: 'text-neutral-900', border: 'border-neutral-400' },
      dark: { surface: 'bg-transparent', text: 'text-neutral-100', border: 'border-neutral-500' },
    },
    neutral: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-neutral-700 dark:text-neutral-300',
        border: 'border-neutral-500 dark:border-neutral-400',
      },
      light: { surface: 'bg-transparent', text: 'text-neutral-700', border: 'border-neutral-500' },
      dark: { surface: 'bg-transparent', text: 'text-neutral-300', border: 'border-neutral-400' },
    },
    red: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-500 dark:border-red-400',
      },
      light: { surface: 'bg-transparent', text: 'text-red-700', border: 'border-red-500' },
      dark: { surface: 'bg-transparent', text: 'text-red-300', border: 'border-red-400' },
    },
    orange: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-500 dark:border-orange-400',
      },
      light: { surface: 'bg-transparent', text: 'text-orange-700', border: 'border-orange-500' },
      dark: { surface: 'bg-transparent', text: 'text-orange-300', border: 'border-orange-400' },
    },
    amber: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-500 dark:border-amber-400',
      },
      light: { surface: 'bg-transparent', text: 'text-amber-700', border: 'border-amber-500' },
      dark: { surface: 'bg-transparent', text: 'text-amber-300', border: 'border-amber-400' },
    },
    green: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-500 dark:border-green-400',
      },
      light: { surface: 'bg-transparent', text: 'text-green-700', border: 'border-green-500' },
      dark: { surface: 'bg-transparent', text: 'text-green-300', border: 'border-green-400' },
    },
    teal: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-teal-700 dark:text-teal-300',
        border: 'border-teal-500 dark:border-teal-400',
      },
      light: { surface: 'bg-transparent', text: 'text-teal-700', border: 'border-teal-500' },
      dark: { surface: 'bg-transparent', text: 'text-teal-300', border: 'border-teal-400' },
    },
    sky: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-500 dark:border-sky-400',
      },
      light: { surface: 'bg-transparent', text: 'text-sky-700', border: 'border-sky-500' },
      dark: { surface: 'bg-transparent', text: 'text-sky-300', border: 'border-sky-400' },
    },
    blue: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-500 dark:border-blue-400',
      },
      light: { surface: 'bg-transparent', text: 'text-blue-700', border: 'border-blue-500' },
      dark: { surface: 'bg-transparent', text: 'text-blue-300', border: 'border-blue-400' },
    },
    violet: {
      theme: {
        surface: 'bg-transparent',
        text: 'text-violet-700 dark:text-violet-300',
        border: 'border-violet-500 dark:border-violet-400',
      },
      light: { surface: 'bg-transparent', text: 'text-violet-700', border: 'border-violet-500' },
      dark: { surface: 'bg-transparent', text: 'text-violet-300', border: 'border-violet-400' },
    },
  },
  'glass-clear': {
    default: {
      theme: { surface: 'bg-white/20 dark:bg-white/5', text: '', border: 'border-black/20 dark:border-white/25' },
      light: { surface: 'bg-white/20', text: 'text-neutral-900', border: 'border-black/20' },
      dark: { surface: 'bg-white/5', text: 'text-neutral-100', border: 'border-white/25' },
    },
    neutral: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-neutral-900 dark:text-neutral-100',
        border: 'border-black/20 dark:border-white/25',
      },
      light: { surface: 'bg-white/20', text: 'text-neutral-900', border: 'border-black/20' },
      dark: { surface: 'bg-white/5', text: 'text-neutral-100', border: 'border-white/25' },
    },
    red: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-red-800 dark:text-red-200',
        border: 'border-red-600/50 dark:border-red-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-red-800', border: 'border-red-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-red-200', border: 'border-red-400/50' },
    },
    orange: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-orange-800 dark:text-orange-200',
        border: 'border-orange-600/50 dark:border-orange-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-orange-800', border: 'border-orange-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-orange-200', border: 'border-orange-400/50' },
    },
    amber: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-amber-800 dark:text-amber-200',
        border: 'border-amber-600/50 dark:border-amber-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-amber-800', border: 'border-amber-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-amber-200', border: 'border-amber-400/50' },
    },
    green: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-600/50 dark:border-green-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-green-800', border: 'border-green-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-green-200', border: 'border-green-400/50' },
    },
    teal: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-teal-800 dark:text-teal-200',
        border: 'border-teal-600/50 dark:border-teal-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-teal-800', border: 'border-teal-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-teal-200', border: 'border-teal-400/50' },
    },
    sky: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-sky-800 dark:text-sky-200',
        border: 'border-sky-600/50 dark:border-sky-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-sky-800', border: 'border-sky-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-sky-200', border: 'border-sky-400/50' },
    },
    blue: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-blue-800 dark:text-blue-200',
        border: 'border-blue-600/50 dark:border-blue-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-blue-800', border: 'border-blue-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-blue-200', border: 'border-blue-400/50' },
    },
    violet: {
      theme: {
        surface: 'bg-white/20 dark:bg-white/5',
        text: 'text-violet-800 dark:text-violet-200',
        border: 'border-violet-600/50 dark:border-violet-400/50',
      },
      light: { surface: 'bg-white/20', text: 'text-violet-800', border: 'border-violet-600/50' },
      dark: { surface: 'bg-white/5', text: 'text-violet-200', border: 'border-violet-400/50' },
    },
  },
  'glass-frost': {
    default: {
      theme: { surface: 'bg-white/55 dark:bg-white/10', text: '', border: 'border-black/10 dark:border-white/20' },
      light: { surface: 'bg-white/55', text: 'text-neutral-900', border: 'border-black/10' },
      dark: { surface: 'bg-white/10', text: 'text-neutral-100', border: 'border-white/20' },
    },
    neutral: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-neutral-900 dark:text-neutral-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-white/55', text: 'text-neutral-900', border: 'border-black/10' },
      dark: { surface: 'bg-white/10', text: 'text-neutral-100', border: 'border-white/20' },
    },
    red: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-red-800 dark:text-red-200',
        border: 'border-red-900/15 dark:border-red-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-red-800', border: 'border-red-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-red-200', border: 'border-red-300/30' },
    },
    orange: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-orange-800 dark:text-orange-200',
        border: 'border-orange-900/15 dark:border-orange-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-orange-800', border: 'border-orange-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-orange-200', border: 'border-orange-300/30' },
    },
    amber: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-amber-800 dark:text-amber-200',
        border: 'border-amber-900/15 dark:border-amber-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-amber-800', border: 'border-amber-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-amber-200', border: 'border-amber-300/30' },
    },
    green: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-900/15 dark:border-green-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-green-800', border: 'border-green-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-green-200', border: 'border-green-300/30' },
    },
    teal: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-teal-800 dark:text-teal-200',
        border: 'border-teal-900/15 dark:border-teal-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-teal-800', border: 'border-teal-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-teal-200', border: 'border-teal-300/30' },
    },
    sky: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-sky-800 dark:text-sky-200',
        border: 'border-sky-900/15 dark:border-sky-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-sky-800', border: 'border-sky-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-sky-200', border: 'border-sky-300/30' },
    },
    blue: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-blue-800 dark:text-blue-200',
        border: 'border-blue-900/15 dark:border-blue-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-blue-800', border: 'border-blue-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-blue-200', border: 'border-blue-300/30' },
    },
    violet: {
      theme: {
        surface: 'bg-white/55 dark:bg-white/10',
        text: 'text-violet-800 dark:text-violet-200',
        border: 'border-violet-900/15 dark:border-violet-300/30',
      },
      light: { surface: 'bg-white/55', text: 'text-violet-800', border: 'border-violet-900/15' },
      dark: { surface: 'bg-white/10', text: 'text-violet-200', border: 'border-violet-300/30' },
    },
  },
  'glass-tint': {
    default: {
      theme: { surface: 'bg-white/60 dark:bg-white/10', text: '', border: 'border-black/10 dark:border-white/20' },
      light: { surface: 'bg-white/60', text: 'text-neutral-900', border: 'border-black/10' },
      dark: { surface: 'bg-white/10', text: 'text-neutral-100', border: 'border-white/20' },
    },
    neutral: {
      theme: {
        surface: 'bg-neutral-500/10 dark:bg-white/10',
        text: 'text-neutral-900 dark:text-neutral-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-neutral-500/10', text: 'text-neutral-900', border: 'border-black/10' },
      dark: { surface: 'bg-white/10', text: 'text-neutral-100', border: 'border-white/20' },
    },
    red: {
      theme: {
        surface: 'bg-red-100/60 dark:bg-red-400/15',
        text: 'text-red-900 dark:text-red-100',
        border: 'border-red-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-red-100/60', text: 'text-red-900', border: 'border-red-900/15' },
      dark: { surface: 'bg-red-400/15', text: 'text-red-100', border: 'border-white/20' },
    },
    orange: {
      theme: {
        surface: 'bg-orange-100/60 dark:bg-orange-400/15',
        text: 'text-orange-900 dark:text-orange-100',
        border: 'border-orange-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-orange-100/60', text: 'text-orange-900', border: 'border-orange-900/15' },
      dark: { surface: 'bg-orange-400/15', text: 'text-orange-100', border: 'border-white/20' },
    },
    amber: {
      theme: {
        surface: 'bg-amber-100/60 dark:bg-amber-400/15',
        text: 'text-amber-900 dark:text-amber-100',
        border: 'border-amber-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-amber-100/60', text: 'text-amber-900', border: 'border-amber-900/15' },
      dark: { surface: 'bg-amber-400/15', text: 'text-amber-100', border: 'border-white/20' },
    },
    green: {
      theme: {
        surface: 'bg-green-100/60 dark:bg-green-400/15',
        text: 'text-green-900 dark:text-green-100',
        border: 'border-green-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-green-100/60', text: 'text-green-900', border: 'border-green-900/15' },
      dark: { surface: 'bg-green-400/15', text: 'text-green-100', border: 'border-white/20' },
    },
    teal: {
      theme: {
        surface: 'bg-teal-100/60 dark:bg-teal-400/15',
        text: 'text-teal-900 dark:text-teal-100',
        border: 'border-teal-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-teal-100/60', text: 'text-teal-900', border: 'border-teal-900/15' },
      dark: { surface: 'bg-teal-400/15', text: 'text-teal-100', border: 'border-white/20' },
    },
    sky: {
      theme: {
        surface: 'bg-sky-100/60 dark:bg-sky-400/15',
        text: 'text-sky-900 dark:text-sky-100',
        border: 'border-sky-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-sky-100/60', text: 'text-sky-900', border: 'border-sky-900/15' },
      dark: { surface: 'bg-sky-400/15', text: 'text-sky-100', border: 'border-white/20' },
    },
    blue: {
      theme: {
        surface: 'bg-blue-100/60 dark:bg-blue-400/15',
        text: 'text-blue-900 dark:text-blue-100',
        border: 'border-blue-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-blue-100/60', text: 'text-blue-900', border: 'border-blue-900/15' },
      dark: { surface: 'bg-blue-400/15', text: 'text-blue-100', border: 'border-white/20' },
    },
    violet: {
      theme: {
        surface: 'bg-violet-100/60 dark:bg-violet-400/15',
        text: 'text-violet-900 dark:text-violet-100',
        border: 'border-violet-900/15 dark:border-white/20',
      },
      light: { surface: 'bg-violet-100/60', text: 'text-violet-900', border: 'border-violet-900/15' },
      dark: { surface: 'bg-violet-400/15', text: 'text-violet-100', border: 'border-white/20' },
    },
  },
  'glass-solid': {
    default: {
      theme: {
        surface: 'bg-neutral-200 dark:bg-neutral-800',
        text: '',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-neutral-200', text: 'text-neutral-900', border: 'border-black/10' },
      dark: { surface: 'bg-neutral-800', text: 'text-neutral-100', border: 'border-white/20' },
    },
    neutral: {
      theme: {
        surface: 'bg-neutral-200 dark:bg-neutral-800',
        text: 'text-neutral-900 dark:text-neutral-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-neutral-200', text: 'text-neutral-900', border: 'border-black/10' },
      dark: { surface: 'bg-neutral-800', text: 'text-neutral-100', border: 'border-white/20' },
    },
    red: {
      theme: {
        surface: 'bg-red-200 dark:bg-red-900',
        text: 'text-red-900 dark:text-red-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-red-200', text: 'text-red-900', border: 'border-black/10' },
      dark: { surface: 'bg-red-900', text: 'text-red-100', border: 'border-white/20' },
    },
    orange: {
      theme: {
        surface: 'bg-orange-200 dark:bg-orange-900',
        text: 'text-orange-900 dark:text-orange-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-orange-200', text: 'text-orange-900', border: 'border-black/10' },
      dark: { surface: 'bg-orange-900', text: 'text-orange-100', border: 'border-white/20' },
    },
    amber: {
      theme: {
        surface: 'bg-amber-200 dark:bg-amber-900',
        text: 'text-amber-900 dark:text-amber-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-amber-200', text: 'text-amber-900', border: 'border-black/10' },
      dark: { surface: 'bg-amber-900', text: 'text-amber-100', border: 'border-white/20' },
    },
    green: {
      theme: {
        surface: 'bg-green-200 dark:bg-green-900',
        text: 'text-green-900 dark:text-green-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-green-200', text: 'text-green-900', border: 'border-black/10' },
      dark: { surface: 'bg-green-900', text: 'text-green-100', border: 'border-white/20' },
    },
    teal: {
      theme: {
        surface: 'bg-teal-200 dark:bg-teal-900',
        text: 'text-teal-900 dark:text-teal-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-teal-200', text: 'text-teal-900', border: 'border-black/10' },
      dark: { surface: 'bg-teal-900', text: 'text-teal-100', border: 'border-white/20' },
    },
    sky: {
      theme: {
        surface: 'bg-sky-200 dark:bg-sky-900',
        text: 'text-sky-900 dark:text-sky-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-sky-200', text: 'text-sky-900', border: 'border-black/10' },
      dark: { surface: 'bg-sky-900', text: 'text-sky-100', border: 'border-white/20' },
    },
    blue: {
      theme: {
        surface: 'bg-blue-200 dark:bg-blue-900',
        text: 'text-blue-900 dark:text-blue-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-blue-200', text: 'text-blue-900', border: 'border-black/10' },
      dark: { surface: 'bg-blue-900', text: 'text-blue-100', border: 'border-white/20' },
    },
    violet: {
      theme: {
        surface: 'bg-violet-200 dark:bg-violet-900',
        text: 'text-violet-900 dark:text-violet-100',
        border: 'border-black/10 dark:border-white/20',
      },
      light: { surface: 'bg-violet-200', text: 'text-violet-900', border: 'border-black/10' },
      dark: { surface: 'bg-violet-900', text: 'text-violet-100', border: 'border-white/20' },
    },
  },
  // Pressed is deeper than inset, so a selected inset shape still sinks.
  'soft-flat': soft('bg-(--dx-soft-ground)', 'bg-(--dx-soft-ground) shadow-(--dx-soft-inset)'),
  'soft-inset': soft(
    'bg-(--dx-soft-ground) shadow-(--dx-soft-inset)',
    'bg-(--dx-soft-ground) shadow-(--dx-soft-pressed)',
  ),
  'soft-raised': soft(
    'bg-(--dx-soft-ground) shadow-(--dx-soft-raised)',
    'bg-(--dx-soft-ground) shadow-(--dx-soft-pressed)',
  ),
};

/** A theme hue outside the pickers' set, drawn by a set as the nearest picker hue. */
export const NEAREST_HUE: Record<string, StyleHue> = {
  yellow: 'amber',
  lime: 'green',
  emerald: 'green',
  cyan: 'sky',
  indigo: 'blue',
  purple: 'violet',
  fuchsia: 'violet',
  pink: 'red',
  rose: 'red',
};

/**
 * The default text colour: the theme's own, or spelled out when a background forces a tone, since the theme's could be
 * the opposite one and vanish into the background.
 */
export const DEFAULT_TEXT: ByTone<string> = { theme: '', light: 'text-neutral-900', dark: 'text-neutral-100' };

export const RADIUS_CLASSES: Record<Radius, string> = {
  'none': 'rounded-none',
  'sm': 'rounded-sm',
  'md': 'rounded-md',
  'lg': 'rounded-lg',
  'xl': 'rounded-xl',
  '2xl': 'rounded-2xl',
};

/** A node's border width as a class, and as padding of the same width for a fading frame. */
export const BORDER_CLASSES: Record<1 | 2 | 4, { border: string; padding: string }> = {
  1: { border: 'border', padding: 'p-px' },
  2: { border: 'border-2', padding: 'p-0.5' },
  4: { border: 'border-4', padding: 'p-1' },
};

/** The fill of a view node showing its child View. */
export const VIEW_FILLS: Record<Opacity, ByTone<string>> = {
  opaque: { theme: 'bg-base-surface', light: 'bg-white', dark: 'bg-neutral-900' },
  translucent: { theme: 'bg-base-surface/70', light: 'bg-white/70', dark: 'bg-neutral-900/70' },
};

/** The canvas colour in SVG: a link caption's backdrop, and the inside of a hollow end marker. */
export const CANVAS_FILLS: Record<Opacity, ByTone<string>> = {
  opaque: { theme: 'fill-base-surface', light: 'fill-white', dark: 'fill-neutral-900' },
  translucent: { theme: 'fill-base-surface/70', light: 'fill-white/70', dark: 'fill-neutral-900/70' },
};

/** A link caption's text. */
export const CAPTION_TEXT: ByTone<string> = {
  theme: 'fill-fg-muted',
  light: 'fill-neutral-600',
  dark: 'fill-neutral-300',
};

/** A background's grid: its dots, its minor lines and its major lines. */
// Lines are fainter than dots: a continuous line reads far stronger than a dot of the same opacity.
export const GRID_CLASSES: ByTone<{ dots: string; minor: string; major: string }> = {
  theme: {
    dots: 'fill-black/15 dark:fill-white/12',
    minor: 'stroke-black/4 dark:stroke-white/5',
    major: 'stroke-black/7 dark:stroke-white/10',
  },
  light: { dots: 'fill-black/15', minor: 'stroke-black/4', major: 'stroke-black/7' },
  dark: { dots: 'fill-white/12', minor: 'stroke-white/5', major: 'stroke-white/10' },
};

/** A wash's hue as a text colour, so its gradient stops can take it as `currentColor`. */
export const WASH_TEXT: Record<StyleHue, string> = {
  neutral: 'text-neutral-border',
  red: 'text-red-border',
  orange: 'text-orange-border',
  amber: 'text-amber-border',
  green: 'text-green-border',
  teal: 'text-teal-border',
  sky: 'text-sky-border',
  blue: 'text-blue-border',
  violet: 'text-violet-border',
};

/** The canvas fill a background's surface draws, screen-wide under the scene; the base surface draws none. */
export const BACKGROUND_FILLS: Record<'base' | 'paper' | 'film' | 'soft', string> = {
  base: '',
  paper: 'bg-[#f4f0e6]',
  film: 'bg-[#050505]',
  soft: 'bg-(--dx-soft-ground)',
};

/** The soft ground in SVG, for a caption's backdrop and a hollow marker's inside on the soft background. */
export const SOFT_CANVAS_FILL = 'fill-(--dx-soft-ground)';

/** A groove's floor and its two lips: shade on the upper wall, light on the lower. */
export const GROOVE_CLASSES = {
  floor: 'stroke-(--dx-soft-well)',
  shade: 'stroke-(--dx-soft-shade)',
  highlight: 'stroke-(--dx-soft-highlight)',
} as const;
