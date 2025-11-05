//
// Copyright 2025 DXOS.org
//

import { default as read$ } from './read';
import { default as update$ } from './update';

/** @deprecated */
export namespace Document {
  export const read = read$;
  export const update = update$;
}
