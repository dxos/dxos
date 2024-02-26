//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { compositeRuntime } from '@dxos/echo-signals/runtime';

import { type ReactiveHandler, createReactiveProxy, isValidProxyTarget } from './proxy';
import { ReactiveArray } from './reactive-array';

export const symbolSchema = Symbol.for('@dxos/schema');
export const symbolTypeAst = Symbol.for('@dxos/type/AST');

export class TypedReactiveHandler<T extends object> implements ReactiveHandler<T> {
  _proxyMap = new WeakMap<object, any>();
  _signal = compositeRuntime.createSignal();
  _isInSet = false;

  _init(target: any): void {
    for (const key in target) {
      if (Array.isArray(target[key]) && !(target instanceof ReactiveArray)) {
        target[key] = new ReactiveArray(...target[key]);
        const schema = this.getPropertySchema(target, key);
        setSchemaProperties(target[key], schema);
      }
    }
  }

  get(target: any, prop: string | symbol, receiver: any): any {
    this._signal.notifyRead();
    const value = Reflect.get(target, prop, receiver);
    if (isValidProxyTarget(value)) {
      return createReactiveProxy(value, this);
    }

    return value;
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    try {
      this._isInSet = true;
      const validatedValue = this.validateValue(target, prop, value);
      const result = Reflect.set(target, prop, validatedValue, receiver);
      this._signal.notifyWrite();
      return result;
    } finally {
      this._isInSet = false;
    }
  }

  defineProperty(target: any, property: string | symbol, attributes: PropertyDescriptor): boolean {
    if (typeof property === 'symbol' || this._isInSet) {
      return Reflect.defineProperty(target, property, attributes);
    }
    const validatedValue = this.validateValue(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: validatedValue,
    });
    this._signal.notifyWrite();
    return result;
  }

  private validateValue(target: any, prop: string | symbol, value: any) {
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

  private getPropertySchema(target: any, prop: string | symbol): S.Schema<any> {
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
