//
// Copyright 2020 DXOS.org
//

import protobufjs from 'protobufjs';

import { Substitutions } from './common';
import { BidirectionalMapingDescriptors, createMappingDescriptors, mapMessage } from './mapping';

export class Schema<T> {
  static fromJson<T extends Record<string, any>> (schema: any, substitutions: Substitutions = {}) {
    const root = protobufjs.Root.fromJSON(schema);
    return new Schema<T>(root, substitutions);
  }

  private readonly _mapping: BidirectionalMapingDescriptors;

  constructor (
    private readonly _typesRoot: protobufjs.Root,
    substitutions: Substitutions
  ) {
    this._mapping = createMappingDescriptors(substitutions);
  }

  getCodecForType<K extends keyof T & string> (typeName: K): Codec<T[K]> {
    if (typeof typeName !== 'string') throw new TypeError('Expected `typeName` argument to be a string');
    const type = this._typesRoot.lookupType(typeName);
    return new Codec(type, this._mapping, this);
  }

  tryGetCodecForType (typeName: string): Codec {
    if (typeof typeName !== 'string') throw new TypeError('Expected `typeName` argument to be a string');
    const type = this._typesRoot.lookupType(typeName);
    return new Codec(type, this._mapping, this);
  }
}

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
}
