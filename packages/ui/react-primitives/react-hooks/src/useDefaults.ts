//
// Copyright 2025 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import { useMemo } from 'react';

/**
 * Returns a memo-ized deep-merged object of the default and value.
 * If value is undefined or null, then returns the default.
 */
export const useDefaults = <T>(value: T | undefined | null, defaults: T): T => {
  return useMemo(() => defaultsDeep({}, defaults, value), [value, defaults]);
};
