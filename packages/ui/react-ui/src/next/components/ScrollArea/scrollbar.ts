//
// Copyright 2026 DXOS.org
//

export type ScrollbarDensity = {
  /** Thickness of the bar/thumb. */
  size: number;
  /** Inset from the track ends; 0 seats the thumb flush, as it is against the end edge. */
  padding: number;
};

/**
 * Scrollbar sizing presets keyed by density tier.
 */
export const scrollbar: Record<'sm' | 'md' | 'lg', ScrollbarDensity> = {
  sm: {
    size: 2,
    padding: 0,
  },
  md: {
    size: 4,
    padding: 0,
  },
  lg: {
    size: 8,
    padding: 0,
  },
};
