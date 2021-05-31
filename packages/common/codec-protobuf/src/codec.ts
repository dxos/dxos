//
// Copyright 2020 DXOS.org
//

import protobufjs from 'protobufjs';

import { BidirectionalMapingDescriptors, mapMessage } from './mapping';
import type { Schema } from './schema';

export class Codec<T = any> {
  constructor (
    private readonly _type: protobufjs.Type,
    private readonly _mapping: BidirectionalMapingDescriptors,
    private readonly _schema: Schema<any>
  ) {}

  encode (value: T): Uint8Array {
    const sub = mapMessage(this._type, this._mapping.encode, value, [this._schema]);
    return this._type.encode(sub).finish();
  }

  decode (data: Uint8Array): T {
    const obj = this._type.toObject(this._type.decode(data));
    return mapMessage(this._type, this._mapping.decode, obj, [this._schema]);
  }

  /**
   * Dynamically add new definitions to this codec. Mutates the underlying schema.
   */
  addJson (schema: any) {
    this._schema.addJson(schema);
  }
}
