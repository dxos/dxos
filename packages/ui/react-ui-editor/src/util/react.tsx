//
// Copyright 2024 DXOS.org
//

import React, { type FC, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { type RenderCallback } from '../types';

// TODO(burdon): Factor out.

export type ElementOptions = {
  className?: string;
};

export const createElement = (tag: string, options?: ElementOptions, children?: ReactNode): HTMLElement => {
  const el = document.createElement(tag);
  if (options?.className) {
    el.className = options.className;
  }
  if (children) {
    el.append(...(Array.isArray(children) ? children : [children]));
  }

  return el;
};

// TODO(burdon): Remove react rendering; use DOM directly.
// NOTE: CM seems to remove/detach/overwrite portals that are attached to the DOM it control.s
export const renderRoot = <T extends Element>(root: T, node: ReactNode): T => {
  createRoot(root).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return root;
};

/**
 * Utility to create a renderer for a React component.
 */
export const createRenderer =
  <Props extends object>(Component: FC<Props>): RenderCallback<Props> =>
  (el, props) => {
    renderRoot(
      el,
      <ThemeProvider tx={defaultTx}>
        <Tooltip.Provider>
          <Component {...props} />
        </Tooltip.Provider>
      </ThemeProvider>,
    );
  };
