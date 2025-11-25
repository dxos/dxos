//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';
import { type ObjectId } from '@dxos/keys';

import { type SchemaMeta, SchemaMetaSymbol, type TypeAnnotation, getTypeAnnotation } from '../annotations';
import { type JsonSchemaType, toEffectSchema, toJsonSchema } from '../json-schema';
import { type TypedObject, type TypedObjectPrototype } from '../object';

import {
  addFieldsToSchema,
  removeFieldsFromSchema,
  setTypenameInSchema,
  updateFieldNameInSchema,
  updateFieldsInSchema,
} from './manipulation';
import { getSnapshot } from './snapshot';
import { StoredSchema } from './stored-schema';

/**
 * Base schema type.
 */
// TODO(burdon): Merge with ImmutableSchema.
export interface BaseSchema<A = any, I = any> extends TypedObject<A, I> {
  // TODO(burdon): Different from mutable?
  get readonly(): boolean;
  // TODO(burdon): Change to external function.
  get mutable(): EchoSchema<A, I>;
  get snapshot(): Schema.Schema<A, I>;
  get jsonSchema(): JsonSchemaType;
}

/**
 * Immutable schema type.
 * @deprecated Use `Schema.Schema.AnyNoContext` instead.
 */
// TODO(burdon): Common abstract base class?
export class ImmutableSchema<A = any, I = any> implements BaseSchema<A, I> {
  private readonly _objectAnnotation: TypeAnnotation;
  constructor(private readonly _schema: Schema.Schema<A, I>) {
    this._objectAnnotation = getTypeAnnotation(this._schema)!;
    invariant(this._objectAnnotation);
  }

  //
  // Effect Schema (push to abstract base class).
  //

  public get [Schema.TypeId]() {
    return schemaVariance;
  }

  public get Type() {
    return this._schema.Type;
  }

  public get Encoded() {
    return this._schema.Encoded;
  }

  public get Context() {
    return this._schema.Context;
  }

  public get ast(): SchemaAST.AST {
    return this._schema.ast;
  }

  public get annotations() {
    return this._schema.annotations;
  }

  public get pipe() {
    return this._schema.pipe;
  }

  //
  // TypedObject
  //

  get typename(): string {
    return this._objectAnnotation.typename;
  }

  get version(): string {
    return this._objectAnnotation.version;
  }

  //
  // BaseSchema
  //

  get readonly(): boolean {
    return true;
  }

  get snapshot(): Schema.Schema.AnyNoContext {
    return this._schema;
  }

  // TODO(burdon): Change from getter since this is expensive.
  get jsonSchema(): JsonSchemaType {
    return toJsonSchema(this._schema);
  }

  get mutable(): EchoSchema {
    throw new Error('Schema is readonly.');
  }
}

/**
 * Defines an effect-schema for the `EchoSchema` type.
 *
 * This is here so that `EchoSchema` class can be used as a part of another schema definition (e.g., `ref(EchoSchema)`).
 */
const EchoSchemaConstructor = (): TypedObjectPrototype => {
  /**
   * Return class definition satisfying Schema.Schema.
   */
  return class {
    private static get _schema() {
      // The field is DynamicEchoSchema in runtime, but is serialized as StoredEchoSchema in automerge.
      return Schema.Union(StoredSchema, Schema.instanceOf(EchoSchema)).annotations(StoredSchema.ast.annotations);
    }

    static readonly [Schema.TypeId] = schemaVariance;

    static get ast() {
      const schema = this._schema;
      return schema.ast;
    }

    static get annotations() {
      const schema = this._schema;
      return schema.annotations.bind(schema);
    }

    static get pipe() {
      const schema = this._schema;
      return schema.pipe.bind(schema);
    }
  } as any;
};

export const isMutable = (schema: Schema.Schema.AnyNoContext): schema is EchoSchema => {
  return schema instanceof EchoSchema;
};

// NOTE: Keep in this file.
const schemaVariance = {
  _A: (_: any) => _,
  _I: (_: any) => _,
  _R: (_: never) => _,
};

/**
 * Represents a schema that is stored in the ECHO database.
 * Schema can me mutable or readonly (specified by the {@link EchoSchema.readonly} field).
 *
 * Schema that can be modified at runtime via the API.
 * Is an instance of effect-schema (`Schema.Schema.AnyNoContext`) so it can be used in the same way as a regular schema.
 * IMPORTANT: The schema AST will change reactively when the schema is updated, including synced updates from remote peers.
 *
 * The class constructor is a schema instance itself, and can be used in the echo object definitions:
 *
 * @example
 * ```ts
 * export class TableType extends Schema.Struct({...}).pipe(Type.Obj({ typename: 'example.org/type/Table', version: '0.1.0' })){
 *   title: Schema.String,
 *   schema: Schema.optional(ref(EchoSchema)),
 *   props: Schema.mutable(S.Array(TablePropSchema)),
 * }) {}
 * ```
 *
 * The ECHO API will translate any references to StoredSchema objects to be resolved as EchoSchema objects.
 */
export class EchoSchema<A = any, I = any> extends EchoSchemaConstructor() implements BaseSchema<A, I> {
  private _schema: Schema.Schema.AnyNoContext | undefined;
  private _isDirty = true;

  constructor(private readonly _storedSchema: StoredSchema) {
    super();
  }

  //
  // Effect Schema (push to abstract base class).
  //

  public get [Schema.TypeId]() {
    return schemaVariance;
  }

  public get Type() {
    return this._storedSchema as A;
  }

  public get Encoded() {
    return this._storedSchema as I;
  }

  public get Context() {
    const schema = this._getSchema();
    return schema.Context;
  }

  public get ast() {
    const schema = this._getSchema();
    return schema.ast;
  }

  public get annotations() {
    const schema = this._getSchema();
    return schema.annotations.bind(schema);
  }

  public get pipe(): Schema.Schema.AnyNoContext['pipe'] {
    const schema = this._getSchema();
    return schema.pipe.bind(schema);
  }

  //
  // BaseSchema
  //

  public get typename(): string {
    return this._storedSchema.typename;
  }

  public get version(): string {
    return this._storedSchema.version;
  }

  public get readonly(): boolean {
    return false;
  }

  /**
   * Returns an immutable schema snapshot of the current state of the schema.
   */
  public get snapshot(): Schema.Schema.AnyNoContext {
    return this._getSchema();
  }

  /**
   * @reactive
   */
  public get jsonSchema(): JsonSchemaType {
    return this._storedSchema.jsonSchema;
  }

  /**
   * Returns a mutable schema.
   */
  public get mutable(): EchoSchema {
    invariant(!this.readonly, 'Schema is not mutable');
    return this;
  }

  //
  // Mutable Schema
  //

  /**
   * Id of the ECHO object containing the schema.
   */
  public get id(): ObjectId {
    return this._storedSchema.id;
  }

  /**
   * Short name of the schema.
   */
  public get name(): string | undefined {
    return this._storedSchema.name;
  }

  public get [SchemaMetaSymbol](): SchemaMeta {
    return { id: this.id, typename: this.typename, version: this._storedSchema.version };
  }

  /**
   * Reference to the underlying stored schema object.
   */
  public get storedSchema(): StoredSchema {
    return this._storedSchema;
  }

  public getProperties(): SchemaAST.PropertySignature[] {
    const ast = this._getSchema().ast;
    invariant(SchemaAST.isTypeLiteral(ast));
    return [...ast.propertySignatures].filter((p) => p.name !== 'id').map(unwrapOptionality);
  }

  //
  // Mutation methods.
  // TODO(burdon): Create separate interface for dynamic schema.
  // TODO(burdon): Deprecate direct manipulation? Use JSONSchema directly.
  //

  /**
   * @throws Error if the schema is readonly.
   */
  public updateTypename(typename: string): void {
    const updated = setTypenameInSchema(this._getSchema(), typename);
    this._storedSchema.typename = typename;
    this._storedSchema.jsonSchema = toJsonSchema(updated);
  }

  /**
   * @throws Error if the schema is readonly.
   */
  public addFields(fields: Schema.Struct.Fields): void {
    const extended = addFieldsToSchema(this._getSchema(), fields);
    this._storedSchema.jsonSchema = toJsonSchema(extended);
  }

  /**
   * @throws Error if the schema is readonly.
   */
  public updateFields(fields: Schema.Struct.Fields): void {
    const updated = updateFieldsInSchema(this._getSchema(), fields);
    this._storedSchema.jsonSchema = toJsonSchema(updated);
  }

  /**
   * @throws Error if the schema is readonly.
   */
  public updateFieldPropertyName({ before, after }: { before: PropertyKey; after: PropertyKey }): void {
    const renamed = updateFieldNameInSchema(this._getSchema(), { before, after });
    this._storedSchema.jsonSchema = toJsonSchema(renamed);
  }

  /**
   * @throws Error if the schema is readonly.
   */
  public removeFields(fieldNames: string[]): void {
    const removed = removeFieldsFromSchema(this._getSchema(), fieldNames);
    this._storedSchema.jsonSchema = toJsonSchema(removed);
  }

  //
  // Internals
  //

  /**
   * Called by EchoSchemaRegistry on update.
   */
  _invalidate(): void {
    this._isDirty = true;
  }

  /**
   * Rebuilds this schema if it is dirty.
   */
  _rebuild(): void {
    if (this._isDirty || this._schema == null) {
      this._schema = toEffectSchema(getSnapshot(this._storedSchema.jsonSchema));
      this._isDirty = false;
    }
  }

  _getSchema(): Schema.Schema.AnyNoContext {
    this._rebuild();
    return this._schema!;
  }
}

// TODO(burdon): Move to effect.
const unwrapOptionality = (property: SchemaAST.PropertySignature): SchemaAST.PropertySignature => {
  if (!SchemaAST.isUnion(property.type)) {
    return property;
  }

  return {
    ...property,
    type: property.type.types.find((type) => !SchemaAST.isUndefinedKeyword(type))!,
  } as any;
};
