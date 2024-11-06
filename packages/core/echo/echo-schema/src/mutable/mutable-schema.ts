//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import {
  addFieldsToSchema,
  updateFieldsInSchema,
  removeFieldsFromSchema,
  updateFieldNameInSchema,
} from './manipulation';
import { StoredSchema } from './types';
import { type HasId, schemaVariance } from '../ast';
import { effectToJsonSchema, jsonToEffectSchema } from '../json';

export interface MutableSchemaConstructor extends S.Schema<MutableSchema> {
  new (): HasId;
}

export const MutableSchemaBase = (): MutableSchemaConstructor => {
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
export class MutableSchema extends MutableSchemaBase() implements S.Schema<any> {
  private _schema: S.Schema<any> | undefined;
  private _isDirty = true;

  constructor(public readonly serializedSchema: StoredSchema) {
    super();
  }

  public override get id() {
    return this.serializedSchema.id;
  }

  public get Type() {
    return this.serializedSchema;
  }

  public get Encoded() {
    return this.serializedSchema;
  }

  public get Context() {
    return this._getSchema().Context;
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

  // TODO(burdon): Comment?
  public get [S.TypeId]() {
    return schemaVariance;
  }

  public get schema(): S.Schema<any> {
    return this._getSchema();
  }

  public get typename(): string {
    return this.serializedSchema.typename;
  }

  // TODO(burdon): Rename.
  invalidate() {
    this._isDirty = true;
  }

  public addFields(fields: S.Struct.Fields) {
    const extended = addFieldsToSchema(this._getSchema(), fields);
    this.serializedSchema.jsonSchema = effectToJsonSchema(extended);
  }

  public updateFields(fields: S.Struct.Fields) {
    const updated = updateFieldsInSchema(this._getSchema(), fields);
    this.serializedSchema.jsonSchema = effectToJsonSchema(updated);
  }

  public updateFieldPropertyName({ before, after }: { before: PropertyKey; after: PropertyKey }) {
    const renamed = updateFieldNameInSchema(this._getSchema(), { before, after });
    this.serializedSchema.jsonSchema = effectToJsonSchema(renamed);
  }

  public removeFields(fieldNames: string[]) {
    const removed = removeFieldsFromSchema(this._getSchema(), fieldNames);
    this.serializedSchema.jsonSchema = effectToJsonSchema(removed);
  }

  public getProperties(): AST.PropertySignature[] {
    const ast = this._getSchema().ast;
    invariant(AST.isTypeLiteral(ast));
    return [...ast.propertySignatures].filter((p) => p.name !== 'id').map(unwrapOptionality);
  }

  private _getSchema() {
    if (this._isDirty || this._schema == null) {
      this._schema = jsonToEffectSchema(unwrapProxy(this.serializedSchema.jsonSchema));
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
