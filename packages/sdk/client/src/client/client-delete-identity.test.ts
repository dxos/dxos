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
  const createPopulatedClient = async () => {
    const client = await openClient();
    await client.halo.createIdentity();
    await client.addTypes([TestSchema.Expando]);

    const space = await client.spaces.create();
    await space.waitUntilReady();
    space.db.add(Obj.make(TestSchema.Expando, { name: 'doomed' }));
    await space.db.flush();
    return client;
  };

  beforeEach(() => {
    dataRoot = mkdtempSync(join(tmpdir(), 'dxos-delete-identity-'));
  });

  afterEach(() => {
    rmSync(dataRoot, { recursive: true, force: true });
  });

  test('removes the identity and the spaces it owned', { timeout: 30_000 }, async () => {
    const client = await createPopulatedClient();
    expect(client.halo.identity.get()).to.exist;
    expect(client.spaces.get()).to.have.length.greaterThan(0);

    await client.halo.deleteIdentity();

    expect(client.halo.identity.get()).to.be.null;
    // Wiping storage leaves the client closed, exactly as `client.reset()` does.
    expect(client.initialized).to.be.false;
  });

  test('a fresh client over the same storage sees no identity, spaces or objects', { timeout: 30_000 }, async () => {
    const client = await createPopulatedClient();
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

  test('is a no-op when there is no identity', { timeout: 30_000 }, async () => {
    const client = await openClient();

    await client.halo.deleteIdentity();

    expect(client.halo.identity.get()).to.be.null;
  });
});
