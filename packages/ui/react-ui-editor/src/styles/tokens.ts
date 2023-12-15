//
// Copyright 2023 DXOS.org
//

import type { StyleSpec } from 'style-mod';

import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

export type ThemeStyles = {
  [selector: string]: StyleSpec;
};

// TODO(thure): Why export the whole theme? Can this be done differently?
export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;
