//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

export class EchoObject extends S.TaggedClass<EchoObject>()('EchoObject', {}) {
  public readonly id = PublicKey.random();

  constructor(props: any = {}) {
    super(props);
    Object.assign(this, props);
    return new Proxy(this, {
      get: (target: any, p: string | symbol, receiver: any): any => {
        log.info(`get(${String(p)})`);
        return Reflect.get(target, p, receiver);
      },
      set: (target: any, p: string | symbol, newValue: any, receiver: any): boolean => {
        log.info(`set(${String(p)}, ${newValue})`);
        Reflect.set(target, p, newValue, receiver);
        return true;
      },
    });
  }

  public __schema = <T = this>(): S.Schema<T> => (this.constructor as any).struct;
}

export class EchoSchema extends EchoObject.extend<EchoSchema>()({
  name: S.string,
  version: S.string,
  schema: S.string,
}) {}
