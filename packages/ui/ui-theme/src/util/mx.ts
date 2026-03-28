//
// Copyright 2022 DXOS.org
//

import {
  Children,
  createElement,
  forwardRef,
  type ForwardRefExoticComponent,
  type ForwardedRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type RefAttributes,
} from 'react';
import { extendTailwindMerge, validators } from 'tailwind-merge';

import { log } from '@dxos/log';
import { type ComposableProps, type SlottableProps } from '@dxos/ui-types';

type AdditionalClassGroups = 'density' | 'dx-focus-ring';

export const mx = extendTailwindMerge<AdditionalClassGroups>({
  extend: {
    classGroups: {
      'font-family': ['font-body', 'font-mono'],
      'font-weight': [
        // App weights
        'font-thin',
        'font-extralight',
        'font-light',
        'font-normal',
        'font-medium',
        'font-semibold',
        'font-bold',
        'font-extrabold',
        'font-black',
        // Arbitrary numbers
        validators.isArbitraryNumber,
      ],

      density: ['dx-density-fine', 'dx-density-coarse'],

      'dx-focus-ring': [
        'dx-focus-ring',
        'dx-focus-ring-inset',
        'dx-focus-ring-always',
        'dx-focus-ring-inset-always',
        'dx-focus-ring-group',
        'dx-focus-ring-group-x',
        'dx-focus-ring-group-y',
        'dx-focus-ring-group-always',
        'dx-focus-ring-group-x-always',
        'dx-focus-ring-group-y-always',
        'dx-focus-ring-inset-over-all',
        'dx-focus-ring-inset-over-all-always',
        'dx-focus-ring-main',
        'dx-focus-ring-main-always',
      ],
    },
  },
});

/**
 * Reconciles className properties from a parent slot.
 * - `className` is set by the Slot merge mechanism.
 * - `classNames` is the consumer-facing prop for theming overrides.
 * Use `composableProps` to reconcile both into a single `className`.
 */
// TODO(burdon): Move to react-ui.
export const composableProps = <P extends HTMLElement = HTMLElement>(
  { className, classNames, ...props }: ComposableProps,
  { className: defaultClassNames, ...defaults }: Partial<HTMLAttributes<P>> | undefined = {},
) => ({
  // Default props.
  ...(defaults as object),

  // Spread supplied props.
  ...props,

  // Compose classnames.
  className: mx(defaultClassNames, className, classNames),
});

/**
 * Factory for slottable components.
 * The implementation receives full `HTMLAttributes<E>` so it can destructure `role`, `style`, etc.
 * Consumers see only `SlottableProps<P>` — a narrow type exposing `classNames`, `className`,
 * `children`, `asChild`, and the custom props `P`.
 *
 * @example
 * ```tsx
 * const MyPanel = slottable<HTMLDivElement, { border?: boolean }>(
 *   ({ children, asChild, border, ...props }, forwardedRef) => {
 *     const { className, ...rest } = composableProps(props);
 *     const Comp = asChild ? Slot : Primitive.div;
 *     return (
 *       <Comp {...rest} className={mx(border && 'border', className)} ref={forwardedRef}>
 *         {children}
 *       </Comp>
 *     );
 *   },
 * );
 * ```
 */
/** Symbol used to mark components created by `composable()` or `slottable()`. */
const COMPOSABLE = Symbol.for('dxos.composable');

export function slottable<E extends HTMLElement, P extends object = {}>(
  render: (props: SlottableProps<P> & HTMLAttributes<E>, forwardedRef: ForwardedRef<E>) => ReactNode,
): ForwardRefExoticComponent<SlottableProps<P> & RefAttributes<E>> {
  const wrapped = (props: SlottableProps<P> & HTMLAttributes<E>, forwardedRef: ForwardedRef<E>) => {
    let warn = false;
    if (props.asChild) {
      try {
        const child = Children.only(props.children);
        if (isValidElement(child) && typeof child.type !== 'string' && !(child.type as any)[COMPOSABLE]) {
          warn = true;
          log.warn('slot child is not composable; create it with composable() or slottable()', {
            child: (child.type as any).displayName ?? (child.type as any).name,
          });
        }
      } catch {
        // Children.only throws if not exactly one child — Slot handles this.
      }
    }

    const result = render(props, forwardedRef);
    if (!warn) {
      return result;
    }

    return createElement('div', { className: 'dx-slot-warning border-2 border-rose-500', role: 'none' }, result);
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
 * @example
 * ```tsx
 * const Leaf = composable<HTMLButtonElement>(({ children, ...props }, forwardedRef) => {
 *   const { className, ...rest } = composableProps(props);
 *   return (
 *     <button {...rest} className={mx('btn', className)} ref={forwardedRef}>
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
