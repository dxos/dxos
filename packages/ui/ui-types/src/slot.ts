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
 *   ({ classNames, className, children, ...props }, ref) => {
 *     return (
 *       <button {...props} className={mx(className, classNames)} ref={ref}>
 *         {children}
 *       </button>
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
