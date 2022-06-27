//
// Copyright 2021 DXOS.org
//

import merge from 'lodash.merge';
import protobufjs, { Root } from 'protobufjs';

import { ProtoCodec } from './codec';
import { Substitutions } from './common';
import { BidirectionalMapingDescriptors, createMappingDescriptors } from './mapping';
import { ServiceDescriptor } from './service';

export class Schema<T, S = {}> {
  static fromJson<T extends Record<string, any>, S extends Record<string, any> = {}> (schema: any, substitutions: Substitutions = {}): Schema<T, S> {
    const root = protobufjs.Root.fromJSON(schema);
    return new Schema(root, substitutions);
  }

  private readonly _mapping: BidirectionalMapingDescriptors;

  private readonly _codecCache: Record<string, ProtoCodec> = {}

  constructor (
    private _typesRoot: protobufjs.Root,
    substitutions: Substitutions
  ) {
    this._mapping = createMappingDescriptors(substitutions);
  }

  getCodecForType<K extends keyof T & string> (typeName: K): ProtoCodec<T[K]> {
    if (typeof typeName !== 'string') {
      throw new TypeError('Expected `typeName` argument to be a string');
    }
    const type = this._typesRoot.lookupType(typeName);
    this._codecCache[type.fullName] ??= new ProtoCodec(type, this._mapping, this);
    return this._codecCache[type.fullName];

  }

  tryGetCodecForType (typeName: string): ProtoCodec {
    if (typeof typeName !== 'string') {
      throw new TypeError('Expected `typeName` argument to be a string');
    }
    const type = this._typesRoot.lookupType(typeName);
    this._codecCache[type.fullName] ??= new ProtoCodec(type, this._mapping, this);
    return this._codecCache[type.fullName];
  }

  getService<K extends keyof S & string> (name: K): ServiceDescriptor<S[K]> {
    if (typeof name !== 'string') {
      throw new TypeError('Expected `name` argument to be a string');
    }
    const service = this._typesRoot.lookupService(name);
    return new ServiceDescriptor(service, this);
  }

  /**
   * Dynamically add new definitions to this schema.
   */
  addJson (schema: any) {
    if (!schema.nested) {
      throw new Error('Invalid schema: missing nested object');
    }
    this._typesRoot = Root.fromJSON(merge(this._typesRoot.toJSON(), schema));
  }
}
