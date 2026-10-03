//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';
import { createRoot } from 'react-dom/client';

import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import { type RenderCallback } from '@dxos/ui-editor/types';

/**
 * @deprecated Use `trim` from `@dxos/util`.
 */
export const str = (...lines: string[]) => lines.join('\n');

/**
 * @deprecated
 */
export const createRenderer =
  <TProps extends object>(Component: FC<TProps>): RenderCallback<TProps> =>
  (el, props) => {
    createRoot(el).render(
      <ThemeProvider.ThemeProvider tx={ThemeProvider.defaultTx}>
        <Component {...props} />
      </ThemeProvider.ThemeProvider>,
    );
  };
