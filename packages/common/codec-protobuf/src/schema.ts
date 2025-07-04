//
// Copyright 2021 DXOS.org
//

import merge from 'lodash.merge';
import pb from 'protobufjs';

import { ProtoCodec } from './codec';
import { type Substitutions } from './common';
import { type BidirectionalMapingDescriptors, createMappingDescriptors } from './mapping';
import { ServiceDescriptor } from './service';

export class Schema<T, S extends {} = {}> {
  static fromJson<T extends Record<string, any>, S extends Record<string, any> = {}>(
    schema: any,
    substitutions: Substitutions = {},
  ): Schema<T, S> {
    const root = pb.Root.fromJSON(schema);
    return new Schema(root, substitutions);
  }

  private readonly _mapping: BidirectionalMapingDescriptors;

  private readonly _codecCache = new Map<string, ProtoCodec>();

  // prettier-ignore
  constructor(
    private _typesRoot: pb.Root,
    substitutions: Substitutions,
  ) {
    this._mapping = createMappingDescriptors(substitutions);
  }

  getCodecForType<K extends keyof T & string>(typeName: K): ProtoCodec<T[K]> {
    if (typeof typeName !== 'string') {
      throw new TypeError('Expected `typeName` argument to be a string');
    }

    let codec = this._codecCache.get(typeName);
    if (codec) {
      return codec;
    }

    if (codec === null) {
      throw new Error(`Type not found: "${typeName}"`);
    }

    const type = this._typesRoot.lookupType(typeName);
    codec = new ProtoCodec(type, this._mapping, this);
    this._codecCache.set(typeName, codec);
    return codec;
  }

  hasType(typeName: string): boolean {
    if (typeName === '') {
      return false;
    }

    if (this._codecCache.has(typeName)) {
      return true;
    }

    try {
      this.tryGetCodecForType(typeName);
      return true;
    } catch {
      return false;
    }
  }

  tryGetCodecForType(typeName: string): ProtoCodec {
    if (typeName === '') {
      throw new Error(`Type not found: "${typeName}"`);
    }

    if (typeof typeName !== 'string') {
      throw new TypeError('Expected `typeName` argument to be a string');
    }

    let codec = this._codecCache.get(typeName);
    if (codec) {
      return codec;
    }

    if (codec === null) {
      throw new Error(`Type not found: "${typeName}"`);
    }

    const type = this._typesRoot.lookupType(typeName);
    codec = new ProtoCodec(type, this._mapping, this);
    this._codecCache.set(typeName, codec);
    return codec;
  }

  getService<K extends keyof S & string>(name: K): ServiceDescriptor<S[K]> {
    if (typeof name !== 'string') {
      throw new TypeError('Expected `name` argument to be a string');
    }

    const service = this._typesRoot.lookupService(name);
    return new ServiceDescriptor(service, this);
  }

  /**
   * Dynamically add new definitions to this schema.
   */
  addJson(schema: any): void {
    if (!schema.nested) {
      throw new Error('Invalid schema: missing nested object');
    }

    this._typesRoot = pb.Root.fromJSON(merge(this._typesRoot.toJSON(), schema));
  }
}
