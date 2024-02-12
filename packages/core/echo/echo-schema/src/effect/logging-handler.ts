import { ReactiveHandler } from './proxy';

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
