//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type ReactElement } from 'react';

import { Next } from '../Next.tsx';
import { type Size, SIZES } from '../sizes.ts';

/**
 * Args every sized story takes: `size` is a properties-panel control (portalled parts inherit it from their trigger's
 * row, DESIGN.md follow-up 57); `allSizes` renders every size at once, which the play tests use to assert geometry per
 * size.
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

/**
 * A storybook decorator, typed structurally so this published entry does not depend on storybook: storybook passes the
 * story (rendered with overridden args) and the story context.
 */
type SizesDecorator = (
  Story: ComponentType<{ args?: Record<string, unknown> }>,
  context: { args: Record<string, unknown> },
) => ReactElement;

export type WithSizesOptions = {
  sizes?: Size[];
};

/**
 * Renders the story at its `size` arg (default `md`), or once per size when `allSizes` is set, each in its own row: a
 * `level='base'` rail-gutter Container at that size, `data-testid='size-<size>'`, with the size passed as the `size` arg.
 * The rows share a full-width frame, the pane (the query container of decision 5), so its width is set by an outer
 * decorator (e.g. `withLayout({ classNames: 'p-0 w-[32rem]' })`).
 */
export const withSizes =
  ({ sizes = SIZES }: WithSizesOptions = {}): SizesDecorator =>
  (Story, context) => {
    const selected = SIZES.find((size) => size === context.args.size) ?? 'md';
    const shown = context.args.allSizes === true ? sizes : [selected];
    return (
      <div className='nx-scope @container flex flex-col w-full' data-size='md'>
        {shown.map((size) => (
          <Next.Container key={size} size={size} gutter='rail' level='base' data-testid={`size-${size}`}>
            <Story args={{ ...context.args, size }} />
          </Next.Container>
        ))}
      </div>
    );
  };
