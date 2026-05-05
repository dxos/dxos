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
    // NOTE: Defer protobufjs Root construction. `pb.Root.fromJSON(schema)` calls
    // `Namespace.resolveAll()` which walks every Type and accesses each Type's
    // lazy `ctor` getter, triggering `util.codegen()` (i.e. `Function(...)`).
    // Cloudflare `workerd` forbids string-based code generation (`EvalError:
    // Code generation from strings disallowed for this context`). By passing the
    // raw schema JSON and constructing the Root lazily on first lookup, modules
    // that only import `@dxos/protocols/proto` (without ever calling
    // `getCodecForType`) load cleanly in workerd.
    return new Schema(undefined, substitutions, schema);
  }

  private readonly _mapping: BidirectionalMapingDescriptors;

  private readonly _codecCache = new Map<string, ProtoCodec>();

  private _typesRoot: pb.Root | undefined;

  private _schemaJson: any | undefined;

  // prettier-ignore
  constructor(
    typesRoot: pb.Root | undefined,
    substitutions: Substitutions,
    schemaJson?: any,
  ) {
    this._typesRoot = typesRoot;
    this._schemaJson = schemaJson;
    this._mapping = createMappingDescriptors(substitutions);
  }

  /**
   * Lazily-constructed protobufjs root.
   *
   * Skipping `pb.Root.fromJSON` (and its eager `resolveAll`) avoids triggering
   * `util.codegen()` at module load time. Callers that actually `encode`/`decode`
   * a {@link ProtoCodec} will still hit `Type.setup()` codegen on first use, so
   * this only fixes the import-time crash, not the runtime crash.
   */
  private get _root(): pb.Root {
    if (this._typesRoot) {
      return this._typesRoot;
    }
    const json = this._schemaJson;
    if (!json) {
      throw new Error('Schema is missing both a typesRoot and a schemaJson.');
    }
    const root = new pb.Root();
    if (json.options) {
      root.setOptions(json.options);
    }
    // `addJSON` does not call `resolveAll`; field/type resolution is deferred to
    // `lookupType` and friends, which still avoid `Type.ctor` access on the
    // happy path.
    root.addJSON(json.nested);
    this._typesRoot = root;
    return root;
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

    const type = this._root.lookupType(typeName);
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

    const type = this._root.lookupType(typeName);
    codec = new ProtoCodec(type, this._mapping, this);
    this._codecCache.set(typeName, codec);
    return codec;
  }

  getService<K extends keyof S & string>(name: K): ServiceDescriptor<S[K]> {
    if (typeof name !== 'string') {
      throw new TypeError('Expected `name` argument to be a string');
    }

    const service = this._root.lookupService(name);
    return new ServiceDescriptor(service, this);
  }

  /**
   * Dynamically add new definitions to this schema.
   */
  addJson(schema: any): void {
    if (!schema.nested) {
      throw new Error('Invalid schema: missing nested object');
    }

    this._typesRoot = pb.Root.fromJSON(merge(this._root.toJSON(), schema));
  }
}
