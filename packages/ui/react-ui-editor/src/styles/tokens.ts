//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import type { StyleSpec } from 'style-mod';

import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

export type ThemeStyles = {
  [selector: string]: StyleSpec;
};

export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export const getToken = (path: string, defaultValue: any = undefined) => get(tokens, path, defaultValue);
