//
// Copyright 2022 DXOS.org
//

// Browser stub for plugin module - plugins are build-time only.

export type * from './types';

export const definitions = (): Record<string, unknown> => {
  throw new Error('Config plugin definitions are not available in the browser');
};
