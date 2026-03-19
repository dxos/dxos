//
// Copyright 2022 DXOS.org
//

import { type HTMLAttributes } from 'react';
import { extendTailwindMerge, validators } from 'tailwind-merge';

import { type ComposableProps } from '@dxos/ui-types';

type AdditionalClassGroups = 'density' | 'dx-focus-ring';

export const mx = extendTailwindMerge<AdditionalClassGroups>({
  extend: {
    classGroups: {
      'font-family': ['font-body', 'font-mono'],
      'font-weight': [
        // App weights
        'font-thin',
        'font-extralight',
        'font-light',
        'font-normal',
        'font-medium',
        'font-semibold',
        'font-bold',
        'font-extrabold',
        'font-black',
        // Arbitrary numbers
        validators.isArbitraryNumber,
      ],

      density: ['dx-density-fine', 'dx-density-coarse'],

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
});

/**
 * Reconciles className properties from a parent slot.
 * - `className` is set by the Slot merge mechanism.
 * - `classNames` is the consumer-facing prop for theming overrides.
 * Use `composableProps` to reconcile both into a single `className`.
 */
export const composableProps = <P extends HTMLElement = HTMLElement>(
  { className, classNames, ...props }: ComposableProps,
  { className: defaultClassNames, ...defaults }: Partial<HTMLAttributes<P>> | undefined = {},
) => ({
  ...(defaults as object),
  ...props,
  className: mx(defaultClassNames, className, classNames),
});
