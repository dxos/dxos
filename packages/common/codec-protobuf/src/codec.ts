//
// Copyright 2020 DXOS.org
//

import { type IConversionOptions } from 'protobufjs';
import type protobufjs from 'protobufjs';

import { type Any, type EncodingOptions, type WithTypeUrl } from './common';
import { type BidirectionalMapingDescriptors } from './mapping';
import { createMessageMapper, type Mapper } from './precompiled-mapping/create-message-mapper';
import type { Schema } from './schema';

export const OBJECT_CONVERSION_OPTIONS: IConversionOptions = {
  // Represent long integers as strings.
  longs: String,

  // Will set empty repeated fields to [] instead of undefined.
  arrays: true,
};

const JSON_CONVERSION_OPTIONS: IConversionOptions = {
  // TODO(dmaretskyi): Internal crash with the current version of protobufjs.
  // longs: String,
  enums: String,
  bytes: String,
  defaults: false,
  json: true,
};

/**
 * Defines a generic encoder/decoder.
 */
export interface Codec<T> {
  encode(obj: T, opts?: EncodingOptions): Uint8Array;
  decode(buffer: Uint8Array, opts?: EncodingOptions): T;
}

/**
 * Protocol buffer codec.
 */
export class ProtoCodec<T = any> implements Codec<T> {
  private readonly _encodeMapper: Mapper;
  private readonly _decodeMapper: Mapper;

  constructor(
    private readonly _type: protobufjs.Type,
    private readonly _mapping: BidirectionalMapingDescriptors,
    private readonly _schema: Schema<any>,
  ) {
    this._encodeMapper = createMessageMapper(this._type, this._mapping.encode);
    this._decodeMapper = createMessageMapper(this._type, this._mapping.decode);
  }

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
    // TODO(burdon): Add to generic type.
    return this._schema;
  }

  encode(value: T, options: EncodingOptions = {}): Uint8Array {
    const sub = this._encodeMapper(value, [this._schema, options]);
    return this._type.encode(sub).finish();
  }

  decode(data: Uint8Array, options: EncodingOptions = {}): T {
    const obj = this._type.toObject(this._type.decode(data), OBJECT_CONVERSION_OPTIONS);
    return this._decodeMapper(obj, [this._schema, options]);
  }

  encodeAsAny(value: T, options: EncodingOptions = {}): WithTypeUrl<Any> {
    return {
      '@type': 'google.protobuf.Any',
      type_url: this._type.fullName.slice(1),
      value: this.encode(value, options),
    };
  }

  fromObject(obj: any): T {
    return this._decodeMapper(this._type.fromObject(obj).toJSON(), [this._schema]);
  }

  /**
   * Dynamically add new definitions to this codec. Mutates the underlying schema.
   */
  addJson(schema: any): void {
    this._schema.addJson(schema);
  }

  encodeToJson(value: T, options: EncodingOptions = {}): any {
    const sub = this._encodeMapper(value, [this._schema, options]);
    return this._type.toObject(sub, JSON_CONVERSION_OPTIONS);
  }

  decodeFromJson(data: any, options: EncodingOptions = {}): T {
    const obj = this._type.toObject(this._type.fromObject(data), OBJECT_CONVERSION_OPTIONS);
    return this._decodeMapper(obj, [this._schema, options]);
  }
}
