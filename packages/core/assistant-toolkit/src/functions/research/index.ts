//
// Copyright 2025 DXOS.org
//

import { default as create$ } from './create-document';
import { default as research$ } from './research';
import { default as update$ } from './update-document';

export * from './research-graph';
export * from './types';

export namespace Research {
  export const create = create$;
  export const update = update$;
  export const research = research$;
}
