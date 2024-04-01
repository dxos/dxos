//
// Copyright 2022 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

import { StoredEchoSchema } from './effect/dynamic/stored-schema';
import { getSchemaTypeRefOrThrow } from './effect/echo-handler';
import * as E from './effect/reactive';
import { TypedObject, dangerouslyMutateImmutableObject, LEGACY_TEXT_TYPE } from './object';
import type { SchemaProps, Schema as SchemaProto } from './proto';

type Prototype = {
  new (...args: any): any;
  schema: SchemaProto;
};

const LEGACY_SCHEMA_TYPE = 'dxos.schema.Schema';

/**
 * Constructed via generated protobuf class.
 * @deprecated
 */
export class TypeCollection {
  private readonly _prototypes = new Map<string, Prototype>();
  private readonly _types = new Map<string, SchemaProto>();
  private readonly _schemaDefs = new Map<string, SchemaProps>();

  private readonly _effectSchemaDefs = new Map<string, S.Schema<any>>();

  constructor() {
    this._effectSchemaDefs.set(LEGACY_TEXT_TYPE, TextCompatibilitySchema);
    this._effectSchemaDefs.set(StoredEchoSchema.typename, StoredEchoSchema);
    this._effectSchemaDefs.set(LEGACY_SCHEMA_TYPE, LegacySchemaTypeSchema);
  }

  get schemas(): SchemaProto[] {
    log.info('schemas', {
      types: this._types.size,
      prototypes: this._prototypes.size,
      schemaDefs: this._schemaDefs.size,
    });
    return Array.from(this._types.values());
  }

  mergeSchema(schema: TypeCollection) {
    Array.from(schema._prototypes.entries()).forEach(([name, prototype]) => {
      invariant(!this._prototypes.has(name), `Schema already exists: ${name}`);
      this._prototypes.set(name, prototype);
    });
    Array.from(schema._types.entries()).forEach(([name, type]) => {
      invariant(!this._types.has(name), `Schema already exists: ${name}`);
      this._types.set(name, type);
    });
  }

  registerEffectSchema(...schemaList: S.Schema<any>[]) {
    schemaList.forEach((schema) => {
      const typename = getTypenameOrThrow(schema);
      if (this._effectSchemaDefs.has(typename)) {
        throw new Error(`Schema was already registered or identifier is not unique: ${typename}`);
      }
      this._effectSchemaDefs.set(typename, schema);
    });

    return this;
  }

  isEffectSchemaRegistered<T>(schema: S.Schema<T>): boolean {
    const typename = getTypenameOrThrow(schema);
    return this._effectSchemaDefs.has(typename);
  }

  getEffectSchema(typename: string): S.Schema<any> | undefined {
    return this._effectSchemaDefs.get(typename);
  }

  /**
   * Called from generated code.
   */
  registerPrototype(proto: Prototype, schema: SchemaProps) {
    this._prototypes.set(schema.typename, proto);
    this._schemaDefs.set(schema.typename, schema);

    Object.defineProperty(proto, Symbol.hasInstance, {
      value: (instance: any) => instance instanceof TypedObject && instance.__typename === schema.typename,
      enumerable: false,
      writable: false,
    });
  }

  getPrototype(name: string): Prototype | undefined {
    return this._prototypes.get(name);
  }

  getSchema(name: string): SchemaProto | undefined {
    return this._types.get(name);
  }

  /**
   * Resolve cross-schema references and instantiate schemas.
   */
  link() {
    if (deferLink) {
      // Circular dependency hack.
      return;
    }

    if (this._types.size !== 0) {
      throw new Error('Already linked.');
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Schema } = require('./proto');
    invariant(Schema, 'Circular dependency.');

    // Create immutable schema objects.
    for (const def of this._schemaDefs.values()) {
      const schema = new Schema(def, { immutable: true });
      this._types.set(schema.typename, schema);
    }

    // Link.
    dangerouslyMutateImmutableObject(() => {
      for (const type of this._types.values()) {
        for (const field of type.props) {
          if (field.refName) {
            if (this._types.has(field.refName)) {
              field.ref = this._types.get(field.refName);
            }
          }
        }

        const proto = this._prototypes.get(type.typename);
        invariant(proto, 'Missing prototype');
        proto.schema = type;
      }
    });

    for (const [typename, proto] of this._prototypes) {
      const schema = this._types.get(typename);
      invariant(schema);
      proto.schema = schema;
    }
  }
}

let deferLink = true;

/**
 * Call after module code has loaded to avoid circular dependency errors.
 */
// TODO(burdon): Factor out.
export const linkDeferred = () => {
  deferLink = false;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { schemaBuiltin } = require('./proto');
  schemaBuiltin.link();
};

const getTypenameOrThrow = (schema: S.Schema<any>): string => getSchemaTypeRefOrThrow(schema).itemId;

const TextCompatibilitySchema = S.partial(
  S.struct({
    kind: S.enums(TextKind),
    field: S.string,
    content: S.string,
  }),
).pipe(E.echoObject(LEGACY_TEXT_TYPE, '0.1.0'));

enum LegacySchemaPropType {
  NONE = 0,
  STRING = 1,
  NUMBER = 2,
  BOOLEAN = 3,
  DATE = 4,
  REF = 5,
  RECORD = 6,
  ENUM = 7,
}

const LegacySchemaPropSchema: S.Schema<any> = S.mutable(
  S.partial(
    S.struct({
      id: S.string,
      type: S.enums(LegacySchemaPropType),
      typename: S.string,
      refName: S.string,
      ref: S.suspend(() => E.ref(LegacySchemaTypeSchema)),
      refModelType: S.string,
      repeated: S.boolean,
      props: S.suspend(() => S.mutable(S.array(LegacySchemaPropSchema))),
      variants: S.partial(S.struct({ tag: S.string, name: S.string })),
      digits: S.number,
      description: S.string,
    }),
  ),
);

const LegacySchemaTypeSchema = S.partial(
  S.struct({
    typename: S.string,
    props: S.mutable(S.array(LegacySchemaPropSchema)),
  }),
).pipe(E.echoObject(LEGACY_SCHEMA_TYPE, '0.1.0'));
