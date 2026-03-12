//
// Copyright 2026 DXOS.org
//

import { type HTMLAttributes } from 'react';

import { type ClassNameValue } from './theme';

// TODO(burdon): Define base type for component with `testId`, etc.

/**
 * Props for components that render a default DOM element but support `asChild` to delegate rendering to a child via Radix Slot.
 * Extends `ComposableProps` with standard HTML attributes.
 *
 * @example
 * ```tsx
 * const Primitive = forwardRef<HTMLDivElement, SlottableProps<HTMLDivElement>>(
 *   ({ children, asChild, ...props }, forwardedRef) => {
 *     const { className, ...rest } = composableProps(props);
 *     const Comp = asChild ? Slot : Primitive.div;
 *     return <Comp {...rest} className={mx('border border-separator', className)} ref={forwardedRef}>{children}</Comp>;
 *   },
 * );
 * ```
 *
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type SlottableProps<P extends HTMLElement = HTMLElement> = HTMLAttributes<P> & {
  classNames?: ClassNameValue;
  asChild?: boolean;
};

/**
 * Props for components that can receive merged props from a Radix Slot parent.
 * - `className` is set by the Slot merge mechanism.
 * - `classNames` is the consumer-facing prop for theming overrides.
 *
 * NOTE: Use `composableProps` to reconcile both into a single `className`.
 *
 * @example
 * ```tsx
 * const Leaf = forwardRef<HTMLButtonElement, ComposableProps & PropsWithChildren>(
 *   ({ children, ...props }, ref) => {
 *     const { className, ...rest } = composableProps(props);
 *     return <button {...rest} className={className} ref={ref}>{children}</button>;
 *   },
 * );
 * ```
 *
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type ComposableProps<P extends HTMLElement = HTMLElement> = HTMLAttributes<P> & {
  classNames?: ClassNameValue;
};
