//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
export type ReactiveObject<T> = { [K in keyof T]: T[K] };

/**
 * Reactive object factory.
 */
export class R {
  /**
   * Creates a reactive object from a plain Javascript object.
   * Optionally provides a TS-effect schema.
   */
  // TODO(burdon): Option to return mutable object?
  static object: {
    <T extends {}>(obj: T): ReactiveObject<T>;
    <T extends {}>(schema: S.Schema<T>, obj: T): ReactiveObject<T>;
  } = <T extends {}>(schemaOrObj: S.Schema<T> | T, obj?: T): ReactiveObject<T> => {
    if (obj) {
      const schema: S.Schema<T> = schemaOrObj as S.Schema<T>;
      const _ = S.asserts(schema)(obj);

      assignAstAnnotations(obj, schema.ast);
      Object.defineProperty(obj, symbolSchema, {
        enumerable: false,
        value: schema,
      });

      return createReactiveProxy(obj, new TypedReactiveHandler());
    } else {
      return createReactiveProxy(schemaOrObj as T, new UntypedReactiveHandler());
    }
  };

  /**
   * Returns the schema for the given object if one is defined.
   */
  static schema<T extends {}>(obj: T): S.Schema<T> | undefined {
    const schema = (obj as any)[symbolSchema];
    if (!schema) {
      return undefined;
    }

    invariant(S.isSchema(schema), 'Invalid schema.');
    return schema as S.Schema<T>;
  }

  constructor() {
    throw new Error('R is a static class and should not be instantiated.');
  }
}

//
// Proxied implementations.
//

const symbolSchema = Symbol('echo_schema');
const symbolTypeAst = Symbol('echo_type_ast');

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

  _init(target: any): void {}

  get(target: any, prop: string | symbol, receiver: any): any {
    this._signal.notifyRead();
    const value = Reflect.get(target, prop, receiver);

    if (isSuitableProxyTarget(value)) {
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
  static symbolChangeLog = Symbol('changeLog');

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

  _init(target: T): void {}

  get(target: any, prop: string | symbol, receiver: any): any {
    this._signal.notifyRead();
    const value = Reflect.get(target, prop, receiver);

    if (isSuitableProxyTarget(value)) {
      return createReactiveProxy(value, this);
    }

    return value;
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    const ast = target[symbolTypeAst] as AST.AST;

    const propSignature = AST.getPropertySignatures(ast).find((property) => property.name === prop);
    if (!propSignature) {
      throw new Error(`Property ${prop.toString()} is not defined in the schema.`);
    }

    // TODO(burdon): Void.
    const _ = S.asserts(S.make(propSignature.type))(value);

    const result = Reflect.set(target, prop, value, receiver);
    this._signal.notifyWrite();
    return result;
  }
}

//
// Utils.
//

// TODO(burdon): Ambiguous name (Suitable?)
const isSuitableProxyTarget = (value: any): value is object =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

const createReactiveProxy = <T extends {}>(target: T, handler: ReactiveHandler<T>): ReactiveObject<T> => {
  if (!isSuitableProxyTarget(target)) {
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

const assignAstAnnotations = (obj: any, ast: AST.AST) => {
  // console.log(inspect(ast, { depth: null, colors: true  }))
  switch (ast._tag) {
    case 'TypeLiteral': {
      for (const property of ast.propertySignatures) {
        const value = obj[property.name];
        if (typeof value === 'object' && value !== null) {
          assignAstAnnotations(value, property.type);
        }
      }
      Object.defineProperty(obj, symbolTypeAst, {
        enumerable: false,
        value: ast,
      });
      break;
    }

    default:
      throw new Error(`Not implemented: ${ast._tag}`);
  }
};
