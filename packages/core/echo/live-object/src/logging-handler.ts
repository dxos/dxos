//
// Copyright 2024 DXOS.org
//

import { type Reference } from '@dxos/echo-protocol';
import { type ObjectMeta } from '@dxos/echo-schema';
import { getObjectMeta } from '@dxos/echo-schema';

import { type ReactiveHandler } from './proxy';

export class LoggingReactiveHandler implements ReactiveHandler<any> {
  static symbolChangeLog = Symbol.for('ChangeLog');

  readonly _proxyMap = new WeakMap<object, any>();

  init(target: any): void {
    target[LoggingReactiveHandler.symbolChangeLog] = [];
  }

  get(target: any, prop: string | symbol, receiver: any) {
    return Reflect.get(target, prop, receiver);
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    target[LoggingReactiveHandler.symbolChangeLog].push(prop);
    return Reflect.set(target, prop, value, receiver);
  }

  isDeleted(): boolean {
    return false;
  }

  getSchema(): undefined {
    return undefined;
  }

  getTypeReference(): Reference | undefined {
    return undefined;
  }

  getMeta(target: any): ObjectMeta {
    return getObjectMeta(target);
  }
}
