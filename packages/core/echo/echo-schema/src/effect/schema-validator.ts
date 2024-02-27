//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';

import { isValidProxyTarget } from './proxy';
import { ReactiveArray } from './reactive-array';

export const symbolSchema = Symbol.for('@dxos/schema');
export const symbolTypeAst = Symbol.for('@dxos/type/AST');

export class SchemaValidator {
  public static prepareTarget<T>(target: T, schema: S.Schema<T>) {
    const _ = S.asserts(schema)(target);
    setSchemaProperties(target, schema);
  }

  public static initTypedTarget(target: any) {
    invariant(target[symbolSchema]);
    this.makeArraysReactive(target);
  }

  private static makeArraysReactive(target: any) {
    for (const key in target) {
      if (Array.isArray(target[key]) && !(target[key] instanceof ReactiveArray)) {
        target[key] = ReactiveArray.from(target[key]);
        const schema = this.getPropertySchema(target, key);
        setSchemaProperties(target[key], schema);
      }
    }
  }

  public static validateValue(target: any, prop: string | symbol, value: any) {
    const schema = this.getPropertySchema(target, prop);
    const _ = S.asserts(schema)(value);
    if (Array.isArray(value)) {
      value = new ReactiveArray(...value);
    }
    if (isValidProxyTarget(value)) {
      setSchemaProperties(value, schema);
    }
    return value;
  }

  private static getPropertySchema(target: any, prop: string | symbol): S.Schema<any> {
    if (target instanceof ReactiveArray) {
      return getArrayElementSchema((target as any)[symbolSchema]);
    }
    const ast = target[symbolTypeAst] as AST.AST;
    const properties = AST.getPropertySignatures(ast).find((property) => property.name === prop);
    if (!properties) {
      throw new Error(`Invalid property: ${prop.toString()}`);
    }
    return S.make(properties.type);
  }
}

const getArrayElementSchema = (arraySchema: S.Schema<any>): S.Schema<any> => {
  return S.make((arraySchema.ast as any).rest.value[0]);
};

/**
 * Recursively set AST property on the object.
 */
// TODO(burdon): Use visitProperties.
export const setSchemaProperties = (obj: any, schema: S.Schema<any>) => {
  if (!obj[symbolSchema]) {
    Object.defineProperty(obj, symbolSchema, { enumerable: false, value: schema });
  }
  if (AST.isTypeLiteral(schema.ast)) {
    Object.defineProperty(obj, symbolTypeAst, {
      enumerable: false,
      value: schema.ast,
    });

    for (const property of schema.ast.propertySignatures) {
      const value = (obj as any)[property.name];
      if (isValidProxyTarget(value)) {
        setSchemaProperties(value, S.make(property.type));
      }
    }
  } else if (Array.isArray(obj) && AST.isTuple(schema.ast)) {
    const elementSchema = getArrayElementSchema(schema);
    for (const value of obj) {
      if (isValidProxyTarget(value)) {
        setSchemaProperties(value, elementSchema);
      }
    }
  }
};
