//
// Copyright 2023 DXOS.org
//

import { type Theme } from '@dxos/ui-types';

import { bindTheme } from './bindTheme.ts';

/** Next styles through `.dx-*` CSS, so the bound theme holds no component tables. */
export const defaultTheme: Theme<Record<string, any>> = {
  themeName: () => 'default',
};

export const defaultTx = bindTheme(defaultTheme);
