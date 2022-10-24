//
// Copyright 2020 DXOS.org
//

import protobufjs, { IConversionOptions } from 'protobufjs';

import { EncodingOptions } from './common';
import { BidirectionalMapingDescriptors } from './mapping';
import { createMessageMapper, Mapper } from './precompiled-mapping/create-message-mapper';
import type { Schema } from './schema';

export const OBJECT_CONVERSION_OPTIONS: IConversionOptions = {
  // Represent long integers as strings.
  longs: String,

  // Will set empty repeated fields to [] instead of undefined.
  arrays: true
};

/**
 * Defines a generic encoder/decoder.
 */
export interface Codec<T> {
  encode(obj: T): Uint8Array
  decode(buffer: Uint8Array): T
}

/**
 * Protocol buffer codec.
 */
export class ProtoCodec<T = any> implements Codec<T> {
  private readonly _encodeMapper: Mapper;
  private readonly _decodeMapper: Mapper;

  constructor (
    private readonly _type: protobufjs.Type,
    private readonly _mapping: BidirectionalMapingDescriptors,
    private readonly _schema: Schema<any>
  ) {
    this._encodeMapper = createMessageMapper(this._type, this._mapping.encode);
    this._decodeMapper = createMessageMapper(this._type, this._mapping.decode);
  }

  /**
   * Underlying protobuf.js type descriptor.
   */
  get protoType (): protobufjs.Type {
    return this._type;
  }

  get substitutionMappings (): BidirectionalMapingDescriptors {
    return this._mapping;
  }

  /**
   * Reference to the protobuf schema this codec was created from.
   */
  get schema (): Schema<any> { // TODO(burdon): Add to generic type.
    return this._schema;
  }

  encode (value: T, options: EncodingOptions = {}): Uint8Array {
    const sub = this._encodeMapper(value, [this._schema, options]);
    return this._type.encode(sub).finish();
  }

  decode (data: Uint8Array, options: EncodingOptions = {}): T {
    const obj = this._type.toObject(this._type.decode(data), OBJECT_CONVERSION_OPTIONS);
    return this._decodeMapper(obj, [this._schema, options]);
  }

  /**
   * Dynamically add new definitions to this codec. Mutates the underlying schema.
   */
  addJson (schema: any) {
    this._schema.addJson(schema);
  }
}
