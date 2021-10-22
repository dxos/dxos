//
// Copyright 2020 DXOS.org
//

import protobufjs, { IConversionOptions } from 'protobufjs';

import { BidirectionalMapingDescriptors, mapMessage } from './mapping';
import { Codec } from './interface';
import type { Schema } from './schema';

export const OBJECT_CONVERSION_OPTIONS: IConversionOptions = {
  // Represent long integers as strings.
  longs: String,

  // Will set empty repeated fields to [] instead of undefined.
  // TODO(marik-d): Type repeated fields as non-optional arrays.
  arrays: true
};

export class ProtoCodec<T = any> implements Codec<T> {
  constructor (
    private readonly _type: protobufjs.Type,
    private readonly _mapping: BidirectionalMapingDescriptors,
    private readonly _schema: Schema<any>
  ) {}

  /**
   * Underlying protobuf.js type descriptor.
   */
  get protoType(): protobufjs.Type {
    return this._type;
  }

  get substitutionMappings(): BidirectionalMapingDescriptors {
    return this._mapping;
  }

  /**
   * Reference to the protobuf schema this codec was created from.
   */
  get schema(): Schema<any> {
    return this._schema;
  }

  encode (value: T): Uint8Array {
    const sub = mapMessage(this._type, this._mapping.encode, value, [this._schema]);
    return this._type.encode(sub).finish();
  }

  decode (data: Uint8Array): T {
    const obj = this._type.toObject(this._type.decode(data), OBJECT_CONVERSION_OPTIONS);
    return mapMessage(this._type, this._mapping.decode, obj, [this._schema]);
  }

  /**
   * Dynamically add new definitions to this codec. Mutates the underlying schema.
   */
  addJson (schema: any) {
    this._schema.addJson(schema);
  }
}
