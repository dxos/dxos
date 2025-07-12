//
// Copyright 2024 DXOS.org
//

import React, { type FC, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { type RenderCallback } from '../types/types';

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
