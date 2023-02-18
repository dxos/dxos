//
// Copyright 2023 DXOS.org
//

import * as Y from 'yjs';

import { YJS } from '@dxos/protocols/proto/dxos/echo/model/document';

import { Reference } from './reference';

const ARRAY_KEY = 'a';

const REFERENCE_KEY = '@reference';

const encodeValue = (value: any): any => {
  if (value instanceof Reference) {
    return Object.fromEntries([[REFERENCE_KEY, value.encode()]]);
  } else if (Array.isArray(value)) {
    return value.map((value) => encodeValue(value));
  } else if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => {
        return [key, encodeValue(value)];
      })
    );
  }
  return value;
};

const decodeValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map((value) => decodeValue(value));
  } else if (typeof value === 'object' && value !== null) {
    if (REFERENCE_KEY in value) {
      return Reference.fromValue(value[REFERENCE_KEY]);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => {
        return [key, decodeValue(value)];
      })
    );
  }
  return value;
};

/**
 * OrderedArray is a wrapper around Y.Array that provides a more convenient API.
 * It also encodes and decodes payload that otherwise cannot be processed by Y.
 */
export class OrderedArray {
  static fromSnapshot(snapshot: YJS) {
    const doc = new Y.Doc();
    Y.applyUpdateV2(doc, snapshot.payload);
    return new OrderedArray(doc, doc.getArray(ARRAY_KEY));
  }

  static fromValues(values: any[]) {
    const doc = new Y.Doc();
    const array = doc.getArray(ARRAY_KEY);

    array.insert(0, encodeValue(values));
    return new OrderedArray(doc, array);
  }

  // prettier-ignore
  constructor(
    public readonly doc: Y.Doc,
    public readonly array: Y.Array<any>
  ) {}

  insert(index: number, content: unknown[]) {
    this.array.insert(index, encodeValue(content));
  }

  delete(index: number, length?: number) {
    this.array.delete(index, length);
  }

  push(content: unknown[]) {
    this.array.push(encodeValue(content));
  }

  unshift(content: unknown[]) {
    this.array.unshift(encodeValue(content));
  }

  encodeSnapshot(): YJS {
    return {
      id: new Uint8Array(),
      payload: Y.encodeStateAsUpdateV2(this.doc)
    };
  }

  toArray() {
    return decodeValue(this.array.toArray());
  }

  get(index: number) {
    return decodeValue(this.array.get(index));
  }

  transact(tx: () => void): YJS {
    let updateReceived: YJS | undefined;
    const cb = (update: any) => {
      updateReceived = {
        id: new Uint8Array(),
        payload: update
      };
    };

    try {
      this.doc.once('updateV2', cb);
      this.doc.transact(() => {
        tx();
      });
    } finally {
      this.doc.off('updateV2', cb);
    }

    if (updateReceived) {
      return updateReceived;
    } else {
      // The transaction was a no-op.
      return {
        id: new Uint8Array(),
        payload: new Uint8Array()
      };
    }
  }

  apply(mutation: YJS) {
    if (mutation.payload.byteLength > 0) {
      Y.applyUpdateV2(this.doc, mutation.payload);
    }
  }
}
