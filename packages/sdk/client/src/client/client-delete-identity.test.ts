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
  // Persistent storage, so "gone" means really wiped rather than merely absent from a fresh
  // in-memory store.
  let dataRoot: string;

  const openClient = async () => {
    const client = new Client({
      config: new Config({ runtime: { client: { storage: { persistent: true, dataRoot } } } }),
    });
    onTestFinished(() => client.destroy());
    await client.initialize();
    return client;
  };

  const createIdentity = (client: Client, displayName: string) =>
    client.halo.createIdentity(buf.create(ProfileDocumentSchema, { displayName }));

  /** Adds a space holding one object. */
  const populate = async (client: Client, name: string) => {
    await client.addTypes([TestSchema.Expando]);
    const space = await client.spaces.create();
    await space.waitUntilReady();
    space.db.add(Obj.make(TestSchema.Expando, { name }));
    await space.db.flush();
    return space;
  };

  beforeEach(() => {
    dataRoot = mkdtempSync(join(tmpdir(), 'dxos-delete-identity-'));
  });

  afterEach(() => {
    rmSync(dataRoot, { recursive: true, force: true });
  });

  test('removes the identity and its spaces, leaving the client open', { timeout: 30_000 }, async () => {
    const client = await openClient();
    await createIdentity(client, 'first');
    await populate(client, 'doomed');
    expect(client.halo.identity.get()).to.exist;
    expect(client.spaces.get()).to.have.length.greaterThan(0);

    await client.halo.deleteIdentity();

    expect(client.halo.identity.get()).to.be.null;
    // The whole point: no teardown, so the client is still usable.
    expect(client.initialized).to.be.true;
    expect(client.resetting).to.be.false;
  });

  test('a new identity can be created immediately afterwards', { timeout: 30_000 }, async () => {
    const client = await openClient();
    const first = await createIdentity(client, 'first');
    const { id: deletedSpaceId } = await populate(client, 'doomed');

    await client.halo.deleteIdentity();

    // No reopen, no second client: straight onto the same live instance.
    const second = await createIdentity(client, 'second');

    // A genuinely new identity, not the deleted one reloaded.
    expect(requirePublicKey(second.identityKey).toHex()).to.not.equal(requirePublicKey(first.identityKey).toHex());
    expect(second.profile?.displayName).to.equal('second');
    expect(client.halo.identity.get()?.profile?.displayName).to.equal('second');

    // It owns nothing the deleted identity did.
    expect(client.spaces.get().map((space) => space.id)).to.not.contain(deletedSpaceId);

    // And it works: creating a space exercises the device credential chain it had to mint.
    const space = await populate(client, 'reborn');
    expect(space.id).to.not.equal(deletedSpaceId);
    const names = (await space.db.query(Filter.type(TestSchema.Expando)).run()).map((obj) => obj.name);
    expect(names).to.deep.equal(['reborn']);
  });

  test('the deleted identity does not come back on a fresh client', { timeout: 30_000 }, async () => {
    const client = await openClient();
    await createIdentity(client, 'first');
    await populate(client, 'doomed');
    await client.halo.deleteIdentity();
    await client.destroy();

    const reopened = await openClient();
    expect(reopened.halo.identity.get()).to.be.null;
    expect(reopened.spaces.get()).to.have.length(0);
  });

  test('is a no-op when there is no identity', { timeout: 30_000 }, async () => {
    const client = await openClient();

    await client.halo.deleteIdentity();

    expect(client.halo.identity.get()).to.be.null;
    expect(client.initialized).to.be.true;
  });
});
