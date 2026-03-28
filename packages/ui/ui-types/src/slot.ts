//
// Copyright 2026 DXOS.org
//

import { type ReactNode } from 'react';

import { type ThemedClassName } from './theme';

// TODO(burdon): Define base type for component with `testId`, etc.

/**
 * Props for components that can receive merged props from a Radix Slot parent.
 * A composable component spreads unknown props onto its root DOM element and forwards its ref,
 * allowing a parent slot to inject layout or styling props transparently.
 *
 * - `className` is set by the Slot merge mechanism.
 * - `classNames` is the consumer-facing prop for theming overrides.
 * - `children` is always accepted.
 *
 * NOTE: Use `composableProps` to reconcile both `className` and `classNames` into a single `className`.
 *
 * @see https://www.radix-ui.com/primitives/docs/guides/composition
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type ComposableProps<P extends object = {}> = ThemedClassName<P> & {
  className?: string;
  children?: ReactNode;
  role?: string;
};

/**
 * Props for components that render a default DOM element but support `asChild` to delegate rendering
 * to a child via Radix Slot. Extends `ComposableProps` with `asChild`.
 *
 * When `asChild` is true the component does not render its own element — instead it clones its child
 * and merges props (including event handlers) onto it.
 *
 * Every slottable component is implicitly composable (it spreads props and forwards its ref).
 *
 * @see https://www.radix-ui.com/primitives/docs/guides/composition
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type SlottableProps<P extends object = {}> = ComposableProps<P> & {
  asChild?: boolean;
};
