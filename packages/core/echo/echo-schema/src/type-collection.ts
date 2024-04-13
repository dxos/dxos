//
// Copyright 2022 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

import { StoredEchoSchema } from './effect/dynamic/stored-schema';
import { getSchemaTypeRefOrThrow } from './effect/echo-handler';
import { TypedObject } from './effect/echo-object-class';
import * as E from './effect/reactive';
import { LEGACY_TEXT_TYPE } from './text';

const LEGACY_SCHEMA_TYPE = 'dxos.schema.Schema';

/**
 * Constructed via generated protobuf class.
 * @deprecated
 */
export class TypeCollection {
  private readonly _effectSchemaDefs = new Map<string, S.Schema<any>>();

  constructor() {
    this._effectSchemaDefs.set(LEGACY_TEXT_TYPE, TextCompatibilitySchema);
    this._effectSchemaDefs.set(StoredEchoSchema.typename, StoredEchoSchema);
    this._effectSchemaDefs.set(LEGACY_SCHEMA_TYPE, LegacySchemaTypeSchema);
  }

  /**
   * @deprecated
   */
  get schemas(): any[] {
    return [];
  }

  /**
   * @deprecated
   */
  mergeSchema(schema: TypeCollection) {}

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
   * @deprecated
   */
  registerPrototype(proto: any, schema: any) {}

  /**
   * @deprecated
   */
  getPrototype(name: string): any {}

  /**
   * @deprecated
   */
  getSchema(name: string): any {}
}

const getTypenameOrThrow = (schema: S.Schema<any>): string => getSchemaTypeRefOrThrow(schema).itemId;

export class TextCompatibilitySchema extends TypedObject({ typename: LEGACY_TEXT_TYPE, version: '0.1.0' })(
  {
    kind: S.enums(TextKind),
    field: S.string,
    content: S.string,
  },
  { partial: true },
) {}

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
