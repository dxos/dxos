//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';

import { StoredEchoSchema } from './stored-schema';
import { effectToJsonSchema, jsonToEffectSchema } from '../json-schema';
import { type Identifiable } from '../reactive';
import { schemaVariance } from '../utils';

export interface DynamicSchemaConstructor extends S.Schema<DynamicEchoSchema> {
  new (): Identifiable;
}

export const DynamicObjectSchemaBase = (): DynamicSchemaConstructor => {
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
      // the field is DynamicEchoSchema in runtime, but is serialized as StoredEchoSchema in automerge
      return S.union(StoredEchoSchema, S.instanceOf(DynamicEchoSchema)).annotations(StoredEchoSchema.ast.annotations);
    }
  } as any;
};

export class DynamicEchoSchema extends DynamicObjectSchemaBase() implements S.Schema<Identifiable> {
  private _schema: S.Schema<any> | undefined;
  private _isDirty = true;
  constructor(public readonly serializedSchema: StoredEchoSchema) {
    super();
  }

  public override get id(): string {
    return this.serializedSchema.id;
  }

  public get typename(): string {
    return this.serializedSchema.typename;
  }

  public addColumns(columns: S.Struct.Fields) {
    const oldSchema = this._getSchema();
    const schemaExtension = S.partial(S.struct(columns));
    const extended = S.extend(oldSchema, schemaExtension).annotations(oldSchema.ast.annotations);
    this.serializedSchema.jsonSchema = effectToJsonSchema(extended as S.Schema<any>);
  }

  public updateColumns(columns: S.Struct.Fields) {
    const oldAst = this._getSchema().ast;
    invariant(AST.isTypeLiteral(oldAst));
    const propertiesToUpdate = (S.partial(S.struct(columns)).ast as AST.TypeLiteral).propertySignatures;
    const updatedProperties: AST.PropertySignature[] = [...oldAst.propertySignatures];
    for (const property of propertiesToUpdate) {
      const index = updatedProperties.findIndex((p) => p.name === property.name);
      if (index >= 0) {
        updatedProperties.splice(index, 1, property);
      } else {
        updatedProperties.push(property);
      }
    }
    const newAst: any = { ...oldAst, propertySignatures: updatedProperties };
    const schemaWithUpdatedColumns = S.make(newAst);
    this.serializedSchema.jsonSchema = effectToJsonSchema(schemaWithUpdatedColumns);
  }

  public removeColumns(columnsNames: string[]) {
    const oldSchema = this._getSchema();
    const newSchema = S.make(AST.omit(oldSchema.ast, columnsNames)).annotations(oldSchema.ast.annotations);
    this.serializedSchema.jsonSchema = effectToJsonSchema(newSchema);
  }

  public getProperties(): AST.PropertySignature[] {
    const ast = this._getSchema().ast;
    invariant(AST.isTypeLiteral(ast));
    return [...ast.propertySignatures].filter((p) => p.name !== 'id').map(unwrapOptionality);
  }

  public get schema(): S.Schema<Identifiable> {
    return this._getSchema();
  }

  public get ast(): AST.AST {
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

  get [S.TypeId]() {
    return schemaVariance;
  }

  invalidate() {
    this._isDirty = true;
  }

  private _getSchema(): S.Schema<any> {
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
    type: property.type.types.find((p) => !AST.isUndefinedKeyword(p))!,
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
