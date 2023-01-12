//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import * as Y from 'yjs';

import { YJS } from '@dxos/protocols/proto/dxos/echo/model/object';

import { Reference } from './reference';

const ARRAY_KEY = 'a';

const REFERENCE_KEY = '@reference';

const encodeValues = (values: unknown[]): unknown[] => {
  const encodeValue = (value: unknown): unknown => {
    if (value === null) {
      return value;
    } else if (value instanceof Reference) {
      return Object.fromEntries([[REFERENCE_KEY, value.encode()]]);
    } else if (Array.isArray(value)) {
      return encodeValues(value);
    } else if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
          return [key, encodeValue(value)];
        })
      );
    }
    return value;
  };

  return values.map((value) => encodeValue(value));
};

const decodeValues = (values: unknown[]): unknown[] => {
  const decodeValue = (value: unknown): unknown => {
    if (value === null) {
      return value;
    } else if (Array.isArray(value)) {
      return decodeValues(value);
    } else if (typeof value === 'object') {
      if (REFERENCE_KEY in value) {
        return Reference.fromValue(value[REFERENCE_KEY] as any);
      }
      return Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
          return [key, decodeValue(value)];
        })
      );
    }
    return value;
  };

  return values.map((value) => decodeValue(value));
};

export class OrderedArray {
  static fromSnapshot(snapshot: YJS) {
    const doc = new Y.Doc();
    Y.applyUpdateV2(doc, snapshot.payload);
    return new OrderedArray(doc, doc.getArray(ARRAY_KEY));
  }

  static fromValues(values: any[]) {
    const doc = new Y.Doc();
    const array = doc.getArray(ARRAY_KEY);

    array.insert(0, encodeValues(values));
    return new OrderedArray(doc, array);
  }

  // prettier-ignore
  constructor(
    public readonly doc: Y.Doc,
    public readonly array: Y.Array<any>
  ) {}

  encodeSnapshot(): YJS {
    return {
      id: new Uint8Array(),
      payload: Y.encodeStateAsUpdateV2(this.doc)
    };
  }

  toArray() {
    return decodeValues(this.array.toArray());
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

    assert(updateReceived);
    return updateReceived;
  }

  apply(mutation: YJS) {
    Y.applyUpdateV2(this.doc, mutation.payload);
  }
}
