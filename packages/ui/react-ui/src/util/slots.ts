//
// Copyright 2022 DXOS.org
//

import {
  Children,
  type CSSProperties,
  type ForwardedRef,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  createElement,
  forwardRef,
  isValidElement,
} from 'react';

import { log } from '@dxos/log';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps, type SlottableProps, type ThemedClassName } from '@dxos/ui-types';

/**
 * Reconciles className properties from a parent slot.
 * - `className` is injected at runtime by the `asChild` merge; it is absent from
 *   `ComposableProps` so consumers cannot pass it, hence the widened parameter type here.
 * - `classNames` is the consumer-facing prop for theming overrides.
 * Use `composableProps` to reconcile both into a single `className`.
 */
export const composableProps = <P extends HTMLElement = HTMLElement>(
  { className, classNames, role, style, ...props }: ComposableProps & { className?: string },
  { classNames: defaultClassNames, ...defaults }: ThemedClassName<Partial<HTMLAttributes<P>>> | undefined = {},
) => ({
  // Default props.
  ...(defaults as object),

  // Spread supplied props.
  ...props,

  // No `role` default. On a div it is a no-op, so the only elements it ever reached were the
  // semantic ones — `Card.Header` renders a <header>, `Main.Content` a <main> — where it stripped
  // the landmark. A part that genuinely wants its element ignored passes the role itself
  // (`role=''` included, so the undefined check rather than truthiness).
  ...((role ?? defaults.role) !== undefined ? { role: role ?? defaults.role } : null),

  // Merge styles.
  style: { ...defaults.style, ...style } as CSSProperties,

  // Compose classnames.
  className: mx(defaultClassNames, className, classNames),
});

/** Symbol used to mark components created by `composable()` or `slottable()`. */
const COMPOSABLE = Symbol.for('dxos.composable');

/**
 * Factory for slottable components.
 * The implementation receives full `HTMLAttributes<E>` so it can destructure `role`, `style`, etc.
 * Consumers see only `SlottableProps<P>` — a narrow type exposing `classNames`, `className`,
 * `children`, `asChild`, and the custom props `P`.
 *
 * @example
 * ```tsx
 * const MyPanel = slottable<HTMLDivElement, { border?: boolean }>(
 *   ({ children, asChild, border, ...props }, forwardedRef) => (
 *     <ark.div asChild={asChild} {...composableProps(props, { classNames: border && 'border' })} ref={forwardedRef}>
 *       {children}
 *     </ark.div>
 *   ),
 * );
 * ```
 */
export function slottable<E extends HTMLElement, P extends object = {}>(
  render: (props: SlottableProps<P> & HTMLAttributes<E>, forwardedRef: ForwardedRef<E>) => ReactNode,
): ForwardRefExoticComponent<SlottableProps<P> & RefAttributes<E>> {
  const wrapped = (props: SlottableProps<P> & HTMLAttributes<E>, forwardedRef: ForwardedRef<E>) => {
    let warn = false;
    // Dev-only: the check walks children on every render of every `asChild` part, and the marker it
    // paints is a developer diagnostic, not a product affordance.
    if (process.env.NODE_ENV !== 'production' && props.asChild) {
      try {
        const child = Children.only(props.children);
        if (isValidElement(child) && typeof child.type !== 'string' && !(child.type as any)[COMPOSABLE]) {
          warn = true;
          log.warn('slot child is not composable; create it with composable() or slottable()', {
            child: (child.type as any).displayName ?? (child.type as any).name,
          });
        }
      } catch {
        // Children.only throws if not exactly one child — `asChild` renders nothing in that case.
      }
    }

    const result = render(props, forwardedRef);
    if (warn) {
      // The marker cannot go on the rendered element: under `asChild` the class is merged into the
      // very child that is dropping props — the bug being flagged
      // swallows its own diagnostic. So it goes on a wrapper, which `dx-slot-warning` renders as
      // `display: contents` so it adds no layout box; the outline is drawn on its children instead.
      return createElement('div', { role: 'none', className: 'dx-slot-warning' }, result);
    }

    return result;
  };

  const component = forwardRef(wrapped as any) as any;
  (component as any)[COMPOSABLE] = true;
  return component;
}

/**
 * Factory for composable (leaf) components.
 * The implementation receives full `HTMLAttributes<E>` so it can destructure `role`, `style`, etc.
 * Consumers see only `ComposableProps<P>` — a narrow type exposing `classNames`, `className`,
 * `children`, and the custom props `P`.
 *
 * For generic components, use `any` for the type parameter inside `composable` and
 * cast the result to restore the generic signature for consumers.
 *
 * @example
 * ```tsx
 * const Leaf = composable<HTMLButtonElement>(({ children, ...props }, forwardedRef) => {
 *   return (
 *     <button {...composableProps(props, { classNames: 'btn' })} ref={forwardedRef}>
 *       {children}
 *     </button>
 *   );
 * });
 * ```
 */
export function composable<E extends HTMLElement, P extends object = {}>(
  render: (props: ComposableProps<P> & HTMLAttributes<E>, forwardedRef: ForwardedRef<E>) => ReactNode,
): ForwardRefExoticComponent<ComposableProps<P> & RefAttributes<E>> {
  const component = forwardRef(render as any) as any;
  (component as any)[COMPOSABLE] = true;
  return component;
}
