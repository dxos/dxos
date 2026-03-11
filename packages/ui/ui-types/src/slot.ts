//
// Copyright 2026 DXOS.org
//

import { type FC, type HTMLAttributes, type JSX, type ReactElement } from 'react';

import { type ClassNameValue } from './theme';

// TODO(burdon): Define base type for component with `testId`, etc.
// TODO(burdon): Branded type for slot-compliant components.
// marker symbol — not exported, so can't be faked

declare const __slotCompliant: unique symbol;

/** Marker interface for components that properly spread all slot props. */
export type SlotCompliant = {
  readonly [__slotCompliant]: true;
};

/** A component that is guaranteed to forward all slot props. */
export type SlotCompliantComponent<P> = FC<P> & SlotCompliant;

/** Either a branded custom component, OR any native element. */
export type SlotChild<P> =
  | { type: SlotCompliantComponent<P> } // Custom: must have brand.
  | { type: keyof JSX.IntrinsicElements }; // Native: inherently safe.

/** Props for components that support `asChild`. */
export type AsChildProps<P> = {
  asChild?: boolean;
  children?: ReactElement<P> & SlotChild<P>;
};

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
export type SlottableProps<P extends HTMLElement | null = null> = ComposableProps<
  HTMLAttributes<P> & {
    asChild?: boolean;
  }
>;

/**
 * Props for components that can receive merged props from a Radix Slot parent.
 * - `className` is set by the Slot merge mechanism.
 * - `classNames` is the consumer-facing prop for theming overrides.
 * Use `composableProps` to reconcile both into a single `className`.
 *
 * @example
 * ```tsx
 * const Leaf = forwardRef<HTMLButtonElement, ComposableProps<PropsWithChildren>>(
 *   ({ children, ...props }, ref) => {
 *     const { className, ...rest } = composableProps(props);
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
