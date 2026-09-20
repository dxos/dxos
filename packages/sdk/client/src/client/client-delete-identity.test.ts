//
// Copyright 2026 DXOS.org
//

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Config } from '@dxos/config';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { buf, requirePublicKey } from '@dxos/protocols/buf';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { Client } from './client.ts';

describe('Client.halo.deleteIdentity', () => {
  // Persistent storage, so a second client over the same root proves the data is really gone
  // rather than merely absent from a fresh in-memory store.
  let dataRoot: string;

  const config = () => new Config({ runtime: { client: { storage: { persistent: true, dataRoot } } } });

  const openClient = async () => {
    const client = new Client({ config: config() });
    onTestFinished(() => client.destroy());
    await client.initialize();
    return client;
  };

  /** A client with an identity, a space and one object in it. */
  const createPopulatedClient = async (displayName = 'first') => {
    const client = await openClient();
    const identity = await client.halo.createIdentity(buf.create(ProfileDocumentSchema, { displayName }));
    await client.addTypes([TestSchema.Expando]);

    const space = await client.spaces.create();
    await space.waitUntilReady();
    space.db.add(Obj.make(TestSchema.Expando, { name: 'doomed' }));
    await space.db.flush();
    return { client, identityKey: requirePublicKey(identity.identityKey).toHex(), spaceId: space.id };
  };

  beforeEach(() => {
    dataRoot = mkdtempSync(join(tmpdir(), 'dxos-delete-identity-'));
  });

  afterEach(() => {
    rmSync(dataRoot, { recursive: true, force: true });
  });

  test('removes the identity and the spaces it owned', { timeout: 30_000 }, async () => {
    const { client } = await createPopulatedClient();
    expect(client.halo.identity.get()).to.exist;
    expect(client.spaces.get()).to.have.length.greaterThan(0);

    await client.halo.deleteIdentity();

    expect(client.halo.identity.get()).to.be.null;
    // Wiping storage leaves the client closed, exactly as `client.reset()` does.
    expect(client.resetting).to.be.true;
  });

  test('a fresh client over the same storage sees no identity, spaces or objects', { timeout: 30_000 }, async () => {
    const { client } = await createPopulatedClient();
    await client.halo.deleteIdentity();

    const reopened = await openClient();
    expect(reopened.halo.identity.get()).to.be.null;
    expect(reopened.spaces.get()).to.have.length(0);

    // The deleted identity's data is gone, so a new one starts empty rather than inheriting it.
    await reopened.halo.createIdentity();
    await reopened.addTypes([TestSchema.Expando]);
    const space = await reopened.spaces.create();
    await space.waitUntilReady();
    const objects = await space.db.query(Filter.type(TestSchema.Expando)).run();
    expect(objects).to.have.length(0);
  });

  test('a new identity created after deletion is distinct and fully usable', { timeout: 30_000 }, async () => {
    const { client, identityKey: deletedKey, spaceId: deletedSpaceId } = await createPopulatedClient('first');
    await client.halo.deleteIdentity();

    const reopened = await openClient();
    const identity = await reopened.halo.createIdentity(buf.create(ProfileDocumentSchema, { displayName: 'second' }));

    // A genuinely new identity, not the deleted one reloaded from the storage that survived.
    expect(requirePublicKey(identity.identityKey).toHex()).to.not.equal(deletedKey);
    expect(identity.profile?.displayName).to.equal('second');
    expect(reopened.halo.identity.get()?.profile?.displayName).to.equal('second');

    // The new identity owns nothing the deleted one did.
    expect(reopened.spaces.get().map((space) => space.id)).to.not.contain(deletedSpaceId);

    // Round-trips its own data, which the RPC surface alone would not prove.
    await reopened.addTypes([TestSchema.Expando]);
    const space = await reopened.spaces.create();
    await space.waitUntilReady();
    expect(space.id).to.not.equal(deletedSpaceId);
    space.db.add(Obj.make(TestSchema.Expando, { name: 'reborn' }));
    await space.db.flush();

    const names = (await space.db.query(Filter.type(TestSchema.Expando)).run()).map((obj) => obj.name);
    expect(names).to.deep.equal(['reborn']);
  });

  test('is a no-op when there is no identity', { timeout: 30_000 }, async () => {
    const client = await openClient();

    await client.halo.deleteIdentity();

    expect(client.halo.identity.get()).to.be.null;
  });
});
