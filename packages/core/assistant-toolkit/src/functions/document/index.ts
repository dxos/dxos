//
// Copyright 2025 DXOS.org
//

import { default as create$ } from './create';
import { default as read$ } from './read';
import { default as update$ } from './update';

export namespace Document {
  export const read = read$;
  export const update = update$;
  export const create = create$;
}
