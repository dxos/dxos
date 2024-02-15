//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { compositeRuntime } from '@dxos/echo-signals/runtime';

import { type ReactiveHandler, createReactiveProxy, isValidProxyTarget } from './proxy';

export const symbolSchema = Symbol.for('@dxos/schema');
export const symbolTypeAst = Symbol.for('@dxos/type/AST');

export class TypedReactiveHandler<T extends object> implements ReactiveHandler<T> {
  _proxyMap = new WeakMap<object, any>();
  _signal = compositeRuntime.createSignal();

  _init(): void {}

  get(target: any, prop: string | symbol, receiver: any): any {
    this._signal.notifyRead();
    const value = Reflect.get(target, prop, receiver);
    if (isValidProxyTarget(value)) {
      return createReactiveProxy(value, this);
    }

    return value;
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    const ast = target[symbolTypeAst] as AST.AST;
    const properties = AST.getPropertySignatures(ast).find((property) => property.name === prop);
    if (!properties) {
      throw new Error(`Invalid property: ${prop.toString()}`);
    }

    const _ = S.asserts(S.make(properties.type))(value);
    const result = Reflect.set(target, prop, value, receiver);
    this._signal.notifyWrite();
    return result;
  }
}

/**
 * Recursively set AST property on the object.
 */
// TODO(burdon): Use visitProperties.
export const setAstProperty = (obj: any, ast: AST.AST) => {
  if (AST.isTypeLiteral(ast)) {
    Object.defineProperty(obj, symbolTypeAst, {
      enumerable: false,
      value: ast,
    });

    for (const property of ast.propertySignatures) {
      const value = obj[property.name];
      if (isValidProxyTarget(value)) {
        setAstProperty(value, property.type);
      }
    }
  }
};
