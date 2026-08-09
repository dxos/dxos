//
// Copyright 2026 DXOS.org
//

export type ScrollbarDensity = {
  /** Thickness of the bar/thumb. */
  size: number;
  /** Inset from the viewport edges. */
  padding: number;
};

/**
 * Scrollbar sizing presets keyed by density tier.
 */
export const scrollbar: Record<'sm' | 'md' | 'lg', ScrollbarDensity> = {
  sm: {
    size: 2,
    padding: 2,
  },
  md: {
    size: 4,
    padding: 2,
  },
  lg: {
    size: 8,
    padding: 2,
  },
};
