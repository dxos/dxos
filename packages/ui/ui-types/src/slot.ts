//
// Copyright 2026 DXOS.org
//

import { HTMLAttributes } from 'react';

import { type ThemedClassName } from './theme';

// TODO(burdon): Define base type for component with `testId`, etc.

/**
 * Props for components that can receive merged props from an `asChild` parent.
 * A composable component spreads unknown props onto its root DOM element and forwards its ref,
 * allowing a parent slot to inject layout or styling props transparently.
 *
 * - `classNames` is the only styling prop a consumer may pass.
 * - `children` is always accepted.
 *
 * `className` is deliberately absent: accepting both gave every part two indistinguishable styling
 * props, and a part that destructured one and spread the other silently dropped the caller's
 * classes. The `asChild` factory still injects `className` at runtime, so implementations receive it via
 * `HTMLAttributes` (see `composable`/`slottable`) and must merge it — that is what `composableProps`
 * does.
 *
 * @see https://ark-ui.com/docs/guides/composition
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type ComposableProps<P extends object = {}> = ThemedClassName<P> &
  Pick<HTMLAttributes<Element>, 'children' | 'role' | 'style'>;

/**
 * Props for components that render a default DOM element but support `asChild` to delegate rendering
 * to a child via `asChild`. Extends `ComposableProps` with `asChild`.
 *
 * When `asChild` is true the component does not render its own element — instead it clones its child
 * and merges props (including event handlers) onto it.
 *
 * Every slottable component is implicitly composable (it spreads props and forwards its ref).
 *
 * @see https://ark-ui.com/docs/guides/composition
 * @see slot.stories.tsx (@dxos/react-ui)
 */
export type SlottableProps<P extends object = {}> = ComposableProps<
  P & {
    asChild?: boolean;
  }
>;
