//
// Copyright 2026 DXOS.org
//

// Kept apart from the host so bench scripts, which Node loads by stripping types, can import it without
// the proxy's modules.

import type * as A from '@automerge/automerge';

/**
 * A saved document with uncompressed columns, which the tab's reader takes: `A.save` compresses them,
 * and only the wasm handle behind a document exposes the uncompressed form.
 */
export const saveNoCompress = (doc: A.Doc<unknown>): Uint8Array => {
  const meta: unknown = Reflect.get(doc, Symbol.for('_am_meta'));
  const handle: unknown = typeof meta === 'object' && meta !== null ? Reflect.get(meta, 'handle') : undefined;
  const save: unknown =
    typeof handle === 'object' && handle !== null ? Reflect.get(handle, 'saveNoCompress') : undefined;
  if (typeof save !== 'function') {
    throw new TypeError('Not an Automerge document');
  }
  const bytes: unknown = Reflect.apply(save, handle, []);
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('saveNoCompress returned no bytes');
  }
  return bytes;
};
