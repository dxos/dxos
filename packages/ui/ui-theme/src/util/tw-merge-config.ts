//
// Copyright 2026 DXOS.org
//

/**
 * Shared tailwind-merge configuration. The single source for both {@link mx} (extendTailwindMerge)
 * and the {@link tv} instance (createTV `twMergeConfig`) so conflict resolution can't drift —
 * notably for dxos custom tokens (`text-base-fg`, density, focus-ring).
 */
export const twMergeConfig = {
  extend: {
    classGroups: {
      'font-family': ['font-body', 'font-mono'],
      'font-weight': [
        'font-thin',
        'font-extralight',
        'font-light',
        'font-normal',
        'font-medium',
        'font-semibold',
        'font-bold',
        'font-extrabold',
        'font-black',
      ],
      density: ['dx-density-sm', 'dx-density-md', 'dx-density-lg'],
      'dx-focus-ring': [
        'dx-focus-ring',
        'dx-focus-ring-inset',
        'dx-focus-ring-always',
        'dx-focus-ring-inset-always',
        'dx-focus-ring-group',
        'dx-focus-ring-group-x',
        'dx-focus-ring-group-y',
        'dx-focus-ring-group-always',
        'dx-focus-ring-group-x-always',
        'dx-focus-ring-group-y-always',
        'dx-focus-ring-inset-over-all',
        'dx-focus-ring-inset-over-all-always',
        'dx-focus-ring-main',
        'dx-focus-ring-main-always',
      ],
    },
  },
} as const;

export type AdditionalClassGroups = 'density' | 'dx-focus-ring';
