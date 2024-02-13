import { AutomergeObjectCore } from '../automerge';
import { TypedObject } from '../object';
import { ReactiveHandler } from './proxy';

const symbolPath = Symbol('path');

type PropPath = (string | number)[];

type ProxyTarget = {
  [symbolPath]: PropPath;
} & (object | any[]);

// TODO(dmaretskyi): Unfinished code.

export class EchoReactiveHandler implements ReactiveHandler<ProxyTarget> {
  _proxyMap = new WeakMap<object, any>();

  _objectCore = new AutomergeObjectCore();

  constructor(obj: TypedObject) {}

  _init(): void {}

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    // if (isValidProxyTarget(value)) {
    //   return createReactiveProxy(value, this);
    // }
    // return value;
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    const result = Reflect.set(target, prop, value, receiver);
    return result;
  }
}
