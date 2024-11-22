//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import {
  addFieldsToSchema,
  removeFieldsFromSchema,
  updateFieldNameInSchema,
  updateFieldsInSchema,
  setTypenameInSchema,
} from './manipulation';
import { StoredSchema } from './types';
import { type HasId, type JsonSchemaType, schemaVariance, type SchemaMeta, SchemaMetaSymbol } from '../ast';
import { toEffectSchema, toJsonSchema } from '../json';

interface MutableSchemaConstructor extends S.Schema<MutableSchema> {
  new (): HasId;
}

const MutableSchemaBase = (): MutableSchemaConstructor => {
  return class {
    static get ast() {
      return this._schema.ast;
    }

    static readonly [S.TypeId] = schemaVariance;

    static get annotations() {
      const schema = this._schema;
      return schema.annotations.bind(schema);
    }

    static get pipe() {
      const schema = this._schema;
      return schema.pipe.bind(schema);
    }

    private static get _schema() {
      // The field is DynamicEchoSchema in runtime, but is serialized as StoredEchoSchema in automerge.
      return S.Union(StoredSchema, S.instanceOf(MutableSchema)).annotations(StoredSchema.ast.annotations);
    }
  } as any;
};

/**
 * Schema that can be modified at runtime via the API.
 */
// TODO(burdon): Why does this have a schema property AND implement schema.
export class MutableSchema extends MutableSchemaBase() implements S.Schema<any> {
  private _schema: S.Schema<any> | undefined;
  private _isDirty = true;

  constructor(private readonly _storedSchema: StoredSchema) {
    super();
  }

  public get [S.TypeId]() {
    return schemaVariance;
  }

  public get [SchemaMetaSymbol](): SchemaMeta {
    return { id: this.id, typename: this.typename, version: this._storedSchema.version };
  }

  public override get id() {
    return this._storedSchema.id;
  }

  public get jsonSchema(): JsonSchemaType {
    return this._storedSchema.jsonSchema;
  }

  // TODO(burdon): Remove?
  public get storedSchema(): StoredSchema {
    return this._storedSchema;
  }

  public get schema(): S.Schema<any> {
    return this._getSchema();
  }

  public get typename(): string {
    return this._storedSchema.typename;
  }

  public get ast() {
    return this._getSchema().ast;
  }

  public get annotations() {
    const schema = this._getSchema();
    return schema.annotations.bind(schema);
  }

  public get pipe() {
    const schema = this._getSchema();
    return schema.pipe.bind(schema);
  }

  public get Type() {
    return this._storedSchema;
  }

  public get Encoded() {
    return this._storedSchema;
  }

  public get Context() {
    return this._getSchema().Context;
  }

  /**
   * Called by MutableSchemaRegistry on update.
   */
  invalidate() {
    this._isDirty = true;
  }

  public getProperties(): AST.PropertySignature[] {
    const ast = this._getSchema().ast;
    invariant(AST.isTypeLiteral(ast));
    return [...ast.propertySignatures].filter((p) => p.name !== 'id').map(unwrapOptionality);
  }

  // TODO(burdon): Deprecate direct manipulation? Use JSONSchema directly.

  public updateTypename(typename: string) {
    const updated = setTypenameInSchema(this._getSchema(), typename);
    this._storedSchema.typename = typename;
    this._storedSchema.jsonSchema = toJsonSchema(updated);
  }

  public addFields(fields: S.Struct.Fields) {
    const extended = addFieldsToSchema(this._getSchema(), fields);
    this._storedSchema.jsonSchema = toJsonSchema(extended);
  }

  public updateFields(fields: S.Struct.Fields) {
    const updated = updateFieldsInSchema(this._getSchema(), fields);
    this._storedSchema.jsonSchema = toJsonSchema(updated);
  }

  public updateFieldPropertyName({ before, after }: { before: PropertyKey; after: PropertyKey }) {
    const renamed = updateFieldNameInSchema(this._getSchema(), { before, after });
    this._storedSchema.jsonSchema = toJsonSchema(renamed);
  }

  public removeFields(fieldNames: string[]) {
    const removed = removeFieldsFromSchema(this._getSchema(), fieldNames);
    this._storedSchema.jsonSchema = toJsonSchema(removed);
  }

  private _getSchema() {
    if (this._isDirty || this._schema == null) {
      this._schema = toEffectSchema(unwrapProxy(this._storedSchema.jsonSchema));
      this._isDirty = false;
    }

    return this._schema;
  }
}

const unwrapOptionality = (property: AST.PropertySignature): AST.PropertySignature => {
  if (!AST.isUnion(property.type)) {
    return property;
  }

  return {
    ...property,
    type: property.type.types.find((type) => !AST.isUndefinedKeyword(type))!,
  } as any;
};

const unwrapProxy = (jsonSchema: any): any => {
  if (typeof jsonSchema !== 'object') {
    return jsonSchema;
  }
  if (Array.isArray(jsonSchema)) {
    return jsonSchema.map(unwrapProxy);
  }

  const result: any = {};
  for (const key in jsonSchema) {
    result[key] = unwrapProxy(jsonSchema[key]);
  }

  return result;
};
