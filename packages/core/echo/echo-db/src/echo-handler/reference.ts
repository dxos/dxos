import { Reference } from '@dxos/echo-protocol';
import { S, TypedObject, create, getProxyHandlerSlot, ref, type EchoReactiveObject, type Ref } from '@dxos/echo-schema';
import type { DXN } from '@dxos/keys';
import { invariant } from '@dxos/invariant';
import { getObjectCore } from '../core-db';
import { symbolInternals, type ProxyTarget } from '../echo-handler/echo-proxy-target';
import { EchoReactiveHandler } from './echo-handler';
import type { EchoDatabase } from '../proxy-db';
import { getDatabaseFromObject } from './util';

export interface ExplicitReference<T> {
  get dxn(): DXN;

  get read(): T | undefined;

  deref(): Promise<T | undefined>;
}

class ExplicitReferenceImpl<T> implements ExplicitReference<T> {
  constructor(
    private _reference: Reference,
    private _database: EchoDatabase | null,
  ) {}

  get dxn(): DXN {
    return this._reference.toDXN();
  }

  get read(): T | undefined {
    invariant(this._reference.protocol === undefined, 'Invalid reference.');
    invariant(this._reference.host === undefined, 'Cross-space references not implemented.');
    invariant(this._database, 'Database not set.');

    return this._database.getObjectById(this._reference.objectId);
  }

  async deref(): Promise<T | undefined> {
    invariant(this._reference.protocol === undefined, 'Invalid reference.');
    invariant(this._reference.host === undefined, 'Cross-space references not implemented.');
    invariant(this._database, 'Database not set.');

    return this._database.loadObjectById(this._reference.objectId);
  }
}

export const readReference = <O extends EchoReactiveObject<{}>, K extends keyof O>(
  obj: O,
  field: K,
): ExplicitReference<NonNullable<O[K]>> | (O[K] & (null | undefined)) => {
  const { value } = EchoReactiveHandler.instance.getDecodedValueAtPath(
    getProxyHandlerSlot(obj as any).target as ProxyTarget,
    field as string,
    { lookupRefs: false },
  );
  if (value == null) {
    return value;
  }
  const db = getDatabaseFromObject(obj);
  invariant(db, '`readReference` requires the object to be stored in the database.');
  if (value instanceof Reference) {
    return new ExplicitReferenceImpl(value, db) as ExplicitReference<NonNullable<O[K]>>;
  }
  throw new TypeError('Invalid type: expected reference.');
};
