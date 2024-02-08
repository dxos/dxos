//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { type Simplify } from 'effect/Types';

import { compositeRuntime } from '@dxos/echo-signals/runtime';

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
export type Re<T> = { [K in keyof T]: T[K] }; //

export type ReactiveFn = {
  <T extends {}>(obj: T): Re<T>;
  <T>(schema: S.Schema<T>, obj: T): Re<Simplify<S.Mutable<T>>>;

  // typed: <T> (schema: S.Schema<T>) => (obj: T) => Re<T>;
};

interface ReactiveHandler<T extends object> extends ProxyHandler<T> {
  /**
   * Called when a proxy is created for this target.
   */
  // TODO(burdon): Should interfaces have private methods?
  _init(target: T): void;

  readonly _proxyMap: WeakMap<object, any>;
}

// TODO(burdon): Suitable? (not a good name).
const isSuitableProxyTarget = (value: any): value is object =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

const createReactiveProxy = <T extends {}>(target: T, handler: ReactiveHandler<T>): Re<T> => {
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

export class DefaultReactiveHandler implements ReactiveHandler<any> {
  signal = compositeRuntime.createSignal();

  // TODO(burdon): Readonly?
  _proxyMap = new WeakMap<object, any>();

  _init(target: any): void {}

  get(target: any, prop: string | symbol, receiver: any): any {
    this.signal.notifyRead();
    const value = Reflect.get(target, prop, receiver);

    if (isSuitableProxyTarget(value)) {
      return createReactiveProxy(value, this);
    }

    return value;
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    const result = Reflect.set(target, prop, value, receiver);
    this.signal.notifyWrite();
    return result;
  }
}

export class LoggingHandler implements ReactiveHandler<any> {
  static symbolChangeLog = Symbol('changeLog');

  _proxyMap = new WeakMap<object, any>();

  _init(target: any): void {
    target[LoggingHandler.symbolChangeLog] = [];
  }

  get(target: any, prop: string | symbol, receiver: any) {
    return Reflect.get(target, prop, receiver);
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    target[LoggingHandler.symbolChangeLog].push(prop);
    return Reflect.set(target, prop, value, receiver);
  }
}

const symbolSchema = Symbol('echo_schema');
const symbolTypeAst = Symbol('echo_type_ast');

export class TypedReactiveHandler<T extends object> implements ReactiveHandler<T> {
  signal = compositeRuntime.createSignal();

  _proxyMap = new WeakMap<object, any>();

  _init(target: T): void {}

  get(target: any, prop: string | symbol, receiver: any): any {
    this.signal.notifyRead();
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
    this.signal.notifyWrite();
    return result;
  }
}

export const reactive: ReactiveFn = <T extends {}>(...args: any[]): Re<T> => {
  switch (args.length) {
    case 1: {
      // Untyped
      return createReactiveProxy(args[0], new DefaultReactiveHandler());
    }
    case 2: {
      const [schema, obj] = args as [S.Schema<T>, T];

      // validate
      const _ = S.asserts(schema)(obj);

      assignAstAnnotations(obj, schema.ast);
      Object.defineProperty(obj, symbolSchema, {
        enumerable: false,
        value: schema,
      });
      return createReactiveProxy(args[1], new TypedReactiveHandler());
    }

    default:
      throw new Error('Invalid arguments.');
  }
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
