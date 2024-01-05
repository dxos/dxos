import { compositeRuntime } from "../util";

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
export type Re<T> = { [K in keyof T]: T[K] }; //

export type ReactiveFn = {
  <T extends {}>(obj: T): Re<T>;
  // <T> (schema: S.Schema<T>): (obj: T) => T & Reactive;

  // typed: <T> (schema: S.Schema<T>) => (obj: T) => T & Reactive;
};

interface ReactiveHandler<T extends object> extends ProxyHandler<T> {
  /**
   * Called when a proxy is created for this target.
   */
  _init(target: T): void;
  
  readonly _proxyMap: WeakMap<object, any>;
}

const isSuitableProxyTarget = (value: any): value is object => typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;


const createReactiveProxy = <T extends {}>(target: T, handler: ReactiveHandler<T>): Re<T> => {
  if(!isSuitableProxyTarget(target)) {
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
}

export class DefaultReactiveHandler implements ReactiveHandler<any> {
  signal = compositeRuntime.createSignal();

  _proxyMap = new WeakMap<object, any>();

  _init(target: any): void {

  }

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

export const reactive: ReactiveFn = <T extends {}>(target: T): Re<T> => {
  return createReactiveProxy(target, new DefaultReactiveHandler());
};