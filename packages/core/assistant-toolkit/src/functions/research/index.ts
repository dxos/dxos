//
// Copyright 2025 DXOS.org
//

import { default as create$ } from './document-create';
import { default as update$ } from './document-update';
import { default as research$ } from './research';

export * from './research-graph';
export * from './types';

export namespace Research {
  export const create = create$;
  export const update = update$;
  export const research = research$;
}
