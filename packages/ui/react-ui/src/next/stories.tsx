//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { Fragment } from 'react';

import { Next } from './Next.tsx';
import { type Size, SIZES } from './sizes.ts';

/** Args every sized story receives from `withSizes`; a portalled part needs it for its own `size` (finding 9). */
export type SizeArgs = {
  size?: Size;
};

export type WithSizesOptions = {
  /** Tailwind width of the frame; the frame is the pane (the query container of decision 5). */
  width?: string;
  sizes?: Size[];
};

/**
 * Renders the story once per size, each in a labelled row: a `level='base'` rail-gutter Container at that size,
 * `data-testid='size-<size>'`, with the size passed to the story as its `size` arg.
 */
export const withSizes =
  ({ width = 'w-[32rem]', sizes = SIZES }: WithSizesOptions = {}): Decorator =>
  (Story, context) => (
    <div
      className={`nx-scope @container grid grid-cols-[min-content_minmax(0,1fr)] ${width} border border-separator`}
      data-size='md'
    >
      {sizes.map((size) => (
        <Fragment key={size}>
          <span className='self-center px-2 text-xs text-description'>{size}</span>
          <Next.Container size={size} gutter='rail' level='base' data-testid={`size-${size}`}>
            <Story args={{ ...context.args, size }} />
          </Next.Container>
        </Fragment>
      ))}
    </div>
  );
