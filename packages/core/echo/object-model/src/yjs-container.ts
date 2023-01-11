import { YJS } from '@dxos/protocols/proto/dxos/echo/model/object'
import * as Y from 'yjs'

const ARRAY_KEY = 'a'

export class OrderedArray {
  static fromSnapshot(snapshot: YJS) {
    const doc = new Y.Doc()
    Y.applyUpdateV2(doc, snapshot.payload)
    return new OrderedArray(doc, doc.getArray(ARRAY_KEY))
  }

  static fromValues(values: any[]) {
    const doc = new Y.Doc()
    const array = doc.getArray(ARRAY_KEY)
    array.insert(0, values)
    return new OrderedArray(doc, array)
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
    }
  }

  toArray() {
    return this.array.toArray() 
  }
}