import type { Reference } from '@dxos/echo-protocol';
import { S, TypedObject, create, ref, type EchoReactiveObject, type Ref } from '@dxos/echo-schema';
import type { DXN } from '@dxos/keys';
import type { EchoDatabase } from './database';
import { invariant } from '@dxos/invariant';
import { getObjectCore } from '../core-db';
import { symbolInternals } from '../echo-handler/echo-proxy-target';

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
): ExplicitReference<NonNullable<O[K]>> => {
  const core = getObjectCore(obj);
  const internals = obj[symbolInternals]
  core.getDecoded(['data', ])

};

// ....

class Org extends TypedObject({ typename: 'example.com/type/Org', version: '1.0.0' })({
  name: S.String,
}) {}

class User extends TypedObject({ typename: 'example.com/type/User', version: '1.0.0' })({
  org: ref(Org),
}) {}

const o = Org;

const org = create(Org, { name: 'Org' });
const user = create(User, { org });

const rr: ExplicitReference<Org> = readReference(user, 'org');
