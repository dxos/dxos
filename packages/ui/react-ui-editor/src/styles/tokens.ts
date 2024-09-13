//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import { tokens } from '@dxos/react-ui-theme';

/**
 * Returns the tailwind token value.
 */
const getToken = (path: string, defaultValue?: string | string[]): string => {
  const value = get(tokens, path, defaultValue);
  return value?.toString() ?? '';
};

export const fontBody = getToken('fontFamily.body');
export const fontMono = getToken('fontFamily.mono');
