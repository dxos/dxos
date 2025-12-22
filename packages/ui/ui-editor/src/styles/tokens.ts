//
// Copyright 2023 DXOS.org
//

import { tokens } from '@dxos/ui-theme';
import { get } from '@dxos/util';

/**
 * Returns the tailwind token value.
 */
const getToken = (path: string, defaultValue?: string | string[]): string => {
  const value = get(tokens, path, defaultValue);
  return value?.toString() ?? '';
};

export const fontBody = getToken('fontFamily.body');
export const fontMono = getToken('fontFamily.mono');
