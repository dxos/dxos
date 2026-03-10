//
// Copyright 2026 DXOS.org
//

import { type HTMLAttributes } from 'react';

import { type ClassNameValue } from './theme';

// TODO(burdon): Define base type for component with `testId`, etc.
//  And base component function wrapper.

/**
 * Props for components that render a default DOM element but support `asChild` to delegate rendering to a child via Radix Slot.
 * Extends `ComposableProps` with standard HTML attributes.
 *
 * @example
 * ```tsx
 * const Primitive = forwardRef<HTMLDivElement, SlottableProps<HTMLDivElement>>(
 *   ({ children, asChild, ...props }, ref) => {
 *     const Comp = asChild ? Slot : Primitive.div;
 *     const { className, ...rest } = useComposableProps(props);
 *     return <Comp {...rest} className={className} ref={ref}>{children}</Comp>;
 *   },
 * );
 * ```
 *
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type SlottableProps<P extends HTMLElement | null = null> = ComposableProps<
  HTMLAttributes<P> & {
    asChild?: boolean;
  }
>;

/**
 * Props for components that can receive merged props from a Radix Slot parent.
 * - `className` is set by the Slot merge mechanism.
 * - `classNames` is the consumer-facing prop for theming overrides.
 * Use `useComposableProps` to reconcile both into a single `className`.
 *
 * @example
 * ```tsx
 * const Leaf = forwardRef<HTMLButtonElement, ComposableProps<PropsWithChildren>>(
 *   ({ children, ...props }, ref) => {
 *     const { className, ...rest } = useComposableProps(props);
 *     return <button {...rest} className={className} ref={ref}>{children}</button>;
 *   },
 * );
 * ```
 *
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type ComposableProps<P = unknown> = P & {
  className?: string;
  classNames?: ClassNameValue;
};
