//
// Copyright 2026 DXOS.org
//

// The host side's use of Automerge; nothing a tab loads imports this module.

import { next as A } from '@automerge/automerge';

import { hashesByActor } from './changes.ts';
import { type Change } from './ids.ts';

/** `A.decodeChange` as the model's change type: Automerge's `Op` type leaves out `elemId` and `insert`. */
export const decodeChange = (bytes: Uint8Array): Change => {
  const decoded = A.decodeChange(bytes);
  return {
    actor: decoded.actor,
    seq: decoded.seq,
    startOp: decoded.startOp,
    time: decoded.time,
    message: decoded.message,
    deps: decoded.deps,
    hash: decoded.hash,
    ops: decoded.ops.map((op) => ({
      action: op.action,
      obj: op.obj,
      ...('elemId' in op && typeof op.elemId === 'string' ? { elemId: op.elemId } : { key: op.key }),
      ...('insert' in op && op.insert === true ? { insert: true } : {}),
      // Automerge gives bytes as a plain array; a set op's value is never an array otherwise.
      ...(op.value !== undefined ? { value: Array.isArray(op.value) ? Uint8Array.from(op.value) : op.value } : {}),
      ...(op.datatype !== undefined ? { datatype: op.datatype } : {}),
      pred: op.pred,
    })),
  };
};

/**
 * A saved document with uncompressed columns, which the tab's reader takes: `A.save` compresses them,
 * and only the wasm handle behind a document exposes the uncompressed form, so an Automerge upgrade
 * that moves it fails here and in this module's test.
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

/** Every change's hash in the snapshot layout, from Automerge; only a document's first load needs this. */
export const hashesOf = (doc: A.Doc<unknown>): Uint8Array => hashesByActor(A.getChangesMetaSince(doc, []));
