//
// Copyright 2026 DXOS.org
//

import {
  type ComponentType,
  type ElementType,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
  createElement,
  forwardRef,
  lazy,
  useState,
} from 'react';

export type PreloadableComponent<P> = ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<unknown>> & {
  /** Fetches the module ahead of the first render; idempotent until it fails. */
  preload: () => Promise<ComponentType<P>>;
};

/**
 * `React.lazy` that can be fetched ahead of use and, once fetched, renders synchronously.
 * A plain `lazy` suspends on its first render even when the chunk is already cached, so content
 * behind it still mounts a commit late — after a dialog has looked for it to focus and trap.
 */
export const lazyWithPreload = <P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
): PreloadableComponent<P> => {
  let loaded: ComponentType<P> | undefined;
  let pending: Promise<ComponentType<P>> | undefined;
  const preload = () =>
    (pending ??= factory().then(
      (module) => (loaded = module.default),
      (error) => {
        pending = undefined;
        throw error;
      },
    ));

  const Lazy = lazy(() => preload().then((component) => ({ default: component })));
  const Preloadable = forwardRef<unknown, P>((props, forwardedRef) => {
    // Fixed per instance: switching from `Lazy` to the loaded type mid-life would remount the subtree.
    const [Component] = useState<ElementType>(() => loaded ?? Lazy);
    return createElement(Component, { ...props, ref: forwardedRef });
  });

  return Object.assign(Preloadable, { preload });
};
