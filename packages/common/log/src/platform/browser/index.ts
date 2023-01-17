//
// Copyright 2022 DXOS.org
//

import { LogOptions } from '../../config';

// NOTE: Implementation for the browser. See `package.json`.
export const loadOptions = (filepath?: string): LogOptions | undefined => {
  try {
    return JSON.parse(localStorage.getItem('dxlog')!);
  } catch (err) {
    return undefined;
  }
};
