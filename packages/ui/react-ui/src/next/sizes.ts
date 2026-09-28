//
// Copyright 2026 DXOS.org
//

export type Metrics = {
  blockSize: string;
  lineHeight: string;
  fontSize: string;
  iconSize: string;
  gapSize: string;
};

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const SIZES: Size[] = ['xs', 'sm', 'md', 'lg', 'xl'];

// Type sizes are the theme's own tokens (`md` is Tailwind's `base`), so the toolbar tracks the scale.
export const metrics: Record<Size, Metrics> = {
  xs: {
    blockSize: '1.25rem',
    lineHeight: 'var(--text-xs--line-height)',
    fontSize: 'var(--text-xs)',
    iconSize: '0.75rem',
    gapSize: '0.25rem',
  },
  sm: {
    blockSize: '1.5rem',
    lineHeight: 'var(--text-sm--line-height)',
    fontSize: 'var(--text-sm)',
    iconSize: '1rem',
    gapSize: '0.25rem',
  },
  md: {
    blockSize: '2rem',
    lineHeight: 'var(--text-base--line-height)',
    fontSize: 'var(--text-base)',
    iconSize: '1.5rem',
    gapSize: '0.5rem',
  },
  lg: {
    blockSize: '2.5rem',
    lineHeight: 'var(--text-lg--line-height)',
    fontSize: 'var(--text-lg)',
    iconSize: '2rem',
    gapSize: '0.5rem',
  },
  xl: {
    blockSize: '3rem',
    lineHeight: 'var(--text-xl--line-height)',
    fontSize: 'var(--text-xl)',
    iconSize: '2.5rem',
    gapSize: '0.5rem',
  },
};
