// need to import the module in order for the declaration
// below to extend it instead of overwriting it.
// https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
//
// Copyright 2024 DXOS.org
//

import '@remix-run/cloudflare';
import type { Env } from './Env';
import type { Mode } from '../utils/mode';

declare module '@remix-run/cloudflare' {
  export interface AppLoadContext {
    env: Env;
    mode: Mode;
  }
}
