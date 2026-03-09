//
// Copyright 2026 DXOS.org
//

import { type HTMLAttributes } from 'react';

import { type ClassNameValue } from './theme';

/**
 * NOTE:
 * - Classnames must be composed.
 * - Primitives should not define styles directly.
 *
 * const Component = forwardRef<HTMLButtonElement, SlottableProps<HTMLButtonElement>>(
 *   ({ children, ...props }, ref) => {
 *     const rest = useSlottedProps(props);
 *     return (
 *       <button {...rest} ref={ref}>
 *         {children}
 *       </button>s
 *     );
 *   },
 * );
 */
export type SlottableClassName<P = unknown> = P & {
  className?: string;
  classNames?: ClassNameValue;
};

/**
 * Properties type for components that implement Radix-style primitives.
 */
export type SlottableProps<P extends HTMLElement | null = null> = SlottableClassName<
  HTMLAttributes<P> & {
    asChild?: boolean;
  }
>;
