//
// Copyright 2026 DXOS.org
//

import { type ComponentType, createElement } from 'react';
import { type Root, createRoot } from 'react-dom/client';

/**
 * A React root inside a Solid tree. The chat thread is `@dxos/react-ui-thread` — the repository's
 * own component, with codemirror in its composer — and porting it to Solid would fork it; mounting
 * it as an island keeps one implementation and one place to fix.
 *
 * Solid's reactivity does not cross the boundary. `render` is called with fresh props whenever the
 * Solid side changes, which is why the island's props are plain values rather than accessors.
 */
export type Island<Props> = {
  readonly render: (props: Props) => void;
  readonly dispose: () => void;
};

export const mount = <Props extends object>(container: HTMLElement, component: ComponentType<Props>): Island<Props> => {
  let root: Root | undefined = createRoot(container);
  return {
    render: (props) => root?.render(createElement(component, props)),
    // Unmounting is deferred: React refuses to unmount a root from inside its own render or commit,
    // which is exactly when Solid's cleanup runs if the two trees dispose together.
    dispose: () => {
      const disposing = root;
      root = undefined;
      queueMicrotask(() => disposing?.unmount());
    },
  };
};
