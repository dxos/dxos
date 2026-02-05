//
// Copyright 2024 DXOS.org
//

import React, { type FC, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { type RenderCallback } from '@dxos/ui-editor';
import { defaultTx } from '@dxos/ui-theme';

/**
 * @deprecated Use `trim` from `@dxos/util`.
 */
export const str = (...lines: string[]) => lines.join('\n');

/** @deprecated */
// TODO(wittjosiah): Replace with portals which are lighter weight and inherit context from the main react tree.
export const renderRoot = <T extends Element>(root: T, node: ReactNode): T => {
  createRoot(root).render(<ThemeProvider tx={defaultTx}>{node}</ThemeProvider>);
  return root;
};

/**
 * Utility to create a renderer for a React component.
 * @deprecated
 */
export const createRenderer =
  <TProps extends object>(Component: FC<TProps>): RenderCallback<TProps> =>
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
