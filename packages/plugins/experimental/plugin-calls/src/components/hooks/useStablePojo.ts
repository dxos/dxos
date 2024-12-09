//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';

/**
 * Useful utility for getting a stable reference to a POJO
 * that might be created on every new render.
 */
export const useStablePojo = <T>(value: T): T => {
  const jsonString = JSON.stringify(value);
  return useMemo(() => JSON.parse(jsonString), [jsonString]);
};
