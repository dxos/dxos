//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';
import { createRoot } from 'react-dom/client';

import * as Theme from '@dxos/react-ui/Theme';
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
      <Theme.Provider tx={Theme.defaultTx}>
        <Component {...props} />
      </Theme.Provider>,
    );
  };
