//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export const getToken = (path: string, defaultValue?: string | string[]): string => {
  const value = get(tokens, path, defaultValue);
  return value?.toString() ?? '';
};
