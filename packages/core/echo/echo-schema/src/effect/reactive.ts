//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';

export const IndexAnnotation = Symbol.for('@dxos/schema/annotation/Index');
export const getIndexAnnotation = AST.getAnnotation<boolean>(IndexAnnotation);

// https://github.com/Effect-TS/effect/blob/main/packages/schema/README.md#introduction

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
// TODO(burdon): Is the type needed?
export type ReactiveObject<T> = { [K in keyof T]: T[K] };

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(burdon): Option to return mutable object.
export const object: {
  <T extends {}>(obj: T): ReactiveObject<T>;
  <T extends {}>(schema: S.Schema<T>, obj: T): ReactiveObject<T>;
} = <T extends {}>(schemaOrObj: S.Schema<T> | T, obj?: T): ReactiveObject<T> => {
  if (obj) {
    const schema: S.Schema<T> = schemaOrObj as S.Schema<T>;
    const _ = S.asserts(schema)(obj);

    Object.defineProperty(obj, symbolSchema, { enumerable: false, value: schema });
    setAstProperty(obj, schema.ast);

    return createReactiveProxy(obj, new TypedReactiveHandler());
  } else {
    return createReactiveProxy(schemaOrObj as T, new UntypedReactiveHandler());
  }
};

/**
 * Returns the schema for the given object if one is defined.
 */
export const getSchema = <T extends {}>(obj: T): S.Schema<T> | undefined => {
  const schema = (obj as any)[symbolSchema];
  if (!schema) {
    return undefined;
  }

  invariant(S.isSchema(schema), 'Invalid schema.');
  return schema as S.Schema<T>;
};

//
// Proxied implementations.
//

const symbolSchema = Symbol.for('@dxos/schema');
const symbolTypeAst = Symbol.for('@dxos/type/AST');

interface ReactiveHandler<T extends object> extends ProxyHandler<T> {
  /**
   * Called when a proxy is created for this target.
   */
  _init(target: T): void;

  readonly _proxyMap: WeakMap<object, any>;
}

export class UntypedReactiveHandler implements ReactiveHandler<any> {
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
    const result = Reflect.set(target, prop, value, receiver);
    this._signal.notifyWrite();
    return result;
  }
}

export class LoggingReactiveHandler implements ReactiveHandler<any> {
  static symbolChangeLog = Symbol.for('ChangeLog');

  _proxyMap = new WeakMap<object, any>();

  _init(target: any): void {
    target[LoggingReactiveHandler.symbolChangeLog] = [];
  }

  get(target: any, prop: string | symbol, receiver: any) {
    return Reflect.get(target, prop, receiver);
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    target[LoggingReactiveHandler.symbolChangeLog].push(prop);
    return Reflect.set(target, prop, value, receiver);
  }
}

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

//
// Utils.
//

const isValidProxyTarget = (value: any): value is object =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

const createReactiveProxy = <T extends {}>(target: T, handler: ReactiveHandler<T>): ReactiveObject<T> => {
  if (!isValidProxyTarget(target)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  const existingProxy = handler._proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const mutableHandler: ReactiveHandler<T> = {} as any;
  Object.setPrototypeOf(mutableHandler, handler);

  const proxy = new Proxy(target, mutableHandler);
  handler._init(target);
  handler._proxyMap.set(target, proxy);
  return proxy;
};

/**
 * Recursively set AST property on the object.
 */
// TODO(burdon): Use visitProperties.
const setAstProperty = (obj: any, ast: AST.AST) => {
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

/**
 * Recursively visit properties of the given object.
 */
// TODO(burdon): Ref unist-util-visit (e.g., specify filter).
export const visitProperties = (
  root: AST.AST,
  visitor: (property: AST.PropertySignature, path: PropertyKey[]) => void,
  rootPath: PropertyKey[] = [],
): void => {
  AST.getPropertySignatures(root).forEach((property) => {
    const path = [...rootPath, property.name];
    visitor(property, path);

    // Recursively visit properties.
    if (AST.isTypeLiteral(property.type)) {
      visitProperties(property.type, visitor, path);
    } else if (AST.isUnion(property.type)) {
      property.type.types.forEach((type) => {
        if (AST.isTypeLiteral(type)) {
          visitProperties(type, visitor, path);
        }
      });
    }
  });
};
