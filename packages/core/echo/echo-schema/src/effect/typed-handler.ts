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
    const schema = this.getPropertySchema(target, prop);
    const _ = S.asserts(schema)(value);
    if (Array.isArray(value)) {
      value = new ReactiveArray(...value);
    }
    if (isValidProxyTarget(value)) {
      setSchemaProperties(value, schema);
    }
    const result = Reflect.set(target, prop, value, receiver);
    this._signal.notifyWrite();
    return result;
  }

  private getPropertySchema(target: any, prop: string | symbol): S.Schema<any> {
    if (target instanceof ReactiveArray) {
      const arraySchema = (target as any)[symbolSchema];
      return S.make(arraySchema.ast.rest.value[0]);
    }
    const ast = target[symbolTypeAst] as AST.AST;
    const properties = AST.getPropertySignatures(ast).find((property) => property.name === prop);
    if (!properties) {
      throw new Error(`Invalid property: ${prop.toString()}`);
    }
    return S.make(properties.type);
  }
}

/**
 * Recursively set AST property on the object.
 */
// TODO(burdon): Use visitProperties.
export const setSchemaProperties = (obj: any, schema: S.Schema<any>) => {
  Object.defineProperty(obj, symbolSchema, { enumerable: false, value: schema });
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
    const type: S.Schema<any> = S.make((schema.ast as any).rest.value[0]);
    for (const property of obj) {
      if (isValidProxyTarget(property)) {
        setSchemaProperties(property, type);
      }
    }
  }
};
