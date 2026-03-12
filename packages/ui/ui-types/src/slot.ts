//
// Copyright 2026 DXOS.org
//

import { type ForwardRefExoticComponent, type HTMLAttributes, type RefAttributes } from 'react';

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
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type SlottableProps<E extends HTMLElement, P extends Record<string, unknown> = {}> =
  HTMLAttributes<E> & P & {
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

/**
 * Marks a component as slot-compatible — its root element accepts and merges
 * structural props from a parent slot (Panel.Content, Panel.Toolbar, etc.).
 *
 * Requirements:
 *   - Spreads unknown props onto the root DOM element.
 *   - Forwards ref to the root DOM element.
 *   - Merges className (does not overwrite).
 *   - Does not add wrapper elements around its root for layout purposes.
 *
 * @example
 * ```tsx
 * const MyComponent: SlotCompatible<HTMLDivElement, { icon?: string }> = forwardRef(
 *   ({ children, icon, ...props }, ref) => {
 *     const { className, ...rest } = composableProps(props);
 *     return <div {...rest} className={mx('my-class', className)} ref={ref}>{children}</div>;
 *   },
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type SlotCompatible<
  E extends HTMLElement,
  P extends Record<string, unknown> = {},
> = ForwardRefExoticComponent<HTMLAttributes<E> & P & RefAttributes<E>>;
