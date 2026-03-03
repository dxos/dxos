//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider, Tooltip } from '@dxos/react-ui';
import { type RenderCallback } from '@dxos/ui-editor';
import { defaultTx } from '@dxos/ui-theme';

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
      <ThemeProvider tx={defaultTx}>
        <Tooltip.Provider>
          <Component {...props} />
        </Tooltip.Provider>
      </ThemeProvider>,
    );
  };
