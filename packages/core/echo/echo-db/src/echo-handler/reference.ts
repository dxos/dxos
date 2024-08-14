//
// Copyright 2024 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { getProxyHandlerSlot, type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import type { DXN } from '@dxos/keys';

import { EchoReactiveHandler } from './echo-handler';
import { symbolInternals, type ProxyTarget } from '../echo-handler/echo-proxy-target';

export interface ExplicitReference<T> {
  get dxn(): DXN;

  get target(): T | undefined;

  deref(): Promise<T | undefined>;
}

class ExplicitReferenceImpl<T> implements ExplicitReference<T> {
  constructor(
    private _reference: Reference,
    private _owner: ProxyTarget,
  ) {}

  get dxn(): DXN {
    return this._reference.toDXN();
  }

  get target(): T | undefined {
    invariant(this._reference.protocol === undefined, 'Invalid reference.');
    invariant(this._reference.host === undefined, 'Cross-space references not implemented.');

    this._owner[symbolInternals].signal.notifyRead();
    return EchoReactiveHandler.instance.lookupRef(this._owner, this._reference);
  }

  async deref(): Promise<T | undefined> {
    invariant(this._reference.protocol === undefined, 'Invalid reference.');
    invariant(this._reference.host === undefined, 'Cross-space references not implemented.');

    return this._owner[symbolInternals].database!.loadObjectById(this._reference.objectId);
  }
}

export const readReference = <O extends EchoReactiveObject<{}>, K extends keyof O>(
  obj: O,
  field: K,
): ExplicitReference<NonNullable<O[K]>> | undefined => {
  const target = getProxyHandlerSlot(obj as any).target as ProxyTarget;
  target[symbolInternals].signal.notifyRead();
  const { value } = EchoReactiveHandler.instance.getDecodedValueAtPath(target, field as string, { lookupRefs: false });
  if (value == null) {
    return value;
  }
  invariant(target[symbolInternals].database, '`readReference` requires the object to be stored in the database.');
  if (value instanceof Reference) {
    return new ExplicitReferenceImpl(value, target) as ExplicitReference<NonNullable<O[K]>>;
  }
  throw new TypeError('Invalid type: expected reference.');
};
