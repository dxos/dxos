//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

export const getToken = (path: string, defaultValue?: string | string[]) => {
  if (Array.isArray(defaultValue)) {
    return get(tokens, path, defaultValue).join(',');
  } else {
    return get(tokens, path, defaultValue);
  }
};
