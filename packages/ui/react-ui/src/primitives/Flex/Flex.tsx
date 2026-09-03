//
// Copyright 2026 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { composableProps, slottable } from '../../util/index.ts';
import { type Align, type Gap, type Justify, alignClasses, gapClasses, justifyClasses } from '../layout.ts';

export type FlexProps = {
  /** Stack on the block axis instead of the inline axis. */
  column?: boolean;
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  /** Absorb slack from the parent track (`flex-1`) and clip rather than push it wider. */
  grow?: boolean;
  /** Center on both axes; equivalent to `align='center' justify='center'`. */
  center?: boolean;
};

/**
 * One-axis layout box: the primitive that replaces hand-written `flex …` wrapper divs.
 *
 * `gap` is restricted to the named steps of the theme spacing ramp (see {@link Gap}), which is the
 * point of the prop — an off-ramp `gap-2`/`gap-3` literal in a container is the drift it prevents.
 * Anything the props don't cover (padding, sizing, overflow, colour) goes through `classNames`; the
 * component deliberately grows no padding or colour props, since components own their own spacing.
 *
 * There is no implicit `align`. Row-centering is the common case, but defaulting it would silently
 * restyle any consumer relying on the CSS `stretch` initial value.
 *
 * Use `asChild` to project the layout onto a semantic element (`<header>`, `<ul>`, `<a>`).
 *
 * @example
 * ```tsx
 * <Flex column gap='sm'>…</Flex>
 * <Flex gap='sm' justify='end'>…</Flex>
 * <Flex center classNames='h-full text-subdued' role='status'>{t('empty.message')}</Flex>
 * ```
 */
export const Flex = slottable<HTMLDivElement, FlexProps>(
  ({ children, asChild, column, gap, align, justify, wrap, grow, center, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        ref={forwardedRef}
        {...rest}
        className={mx(
          'flex',
          column && 'flex-col',
          gap && gapClasses[gap],
          center && 'items-center justify-center',
          align && alignClasses[align],
          justify && justifyClasses[justify],
          wrap && 'flex-wrap',
          grow && 'flex-1 overflow-hidden',
          className,
        )}
      >
        {children}
      </Comp>
    );
  },
);

Flex.displayName = 'Flex';
