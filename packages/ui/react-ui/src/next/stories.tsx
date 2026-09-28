//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React from 'react';

import { Next } from './Next.tsx';
import { type Size, SIZES } from './sizes.ts';

/**
 * Args every sized story takes: `size` is a properties-panel control (a portalled part also needs it for its own `size`,
 * finding 9); `allSizes` renders every size at once, which the play tests use to assert geometry per size.
 */
export type SizeArgs = {
  size?: Size;
  allSizes?: boolean;
};

/** The `size` control for a story's properties panel; `allSizes` is hidden because only tests set it. */
export const SIZE_ARG_TYPES = {
  size: { control: 'select', options: SIZES },
  allSizes: { table: { disable: true } },
} as const;

export type WithSizesOptions = {
  /** Tailwind width of the frame; the frame is the pane (the query container of decision 5). */
  width?: string;
  sizes?: Size[];
};

/**
 * Renders the story at its `size` arg (default `md`), or once per size when `allSizes` is set, each in its own row: a
 * `level='base'` rail-gutter Container at that size, `data-testid='size-<size>'`, with the size passed as the `size` arg.
 */
export const withSizes =
  ({ width = 'w-[32rem]', sizes = SIZES }: WithSizesOptions = {}): Decorator =>
  (Story, context) => {
    const selected = SIZES.find((size) => size === context.args.size) ?? 'md';
    const shown = context.args.allSizes === true ? sizes : [selected];
    return (
      <div className={`nx-scope @container flex flex-col ${width}`} data-size='md'>
        {shown.map((size) => (
          <Next.Container key={size} size={size} gutter='rail' level='base' data-testid={`size-${size}`}>
            <Story args={{ ...context.args, size }} />
          </Next.Container>
        ))}
      </div>
    );
  };
