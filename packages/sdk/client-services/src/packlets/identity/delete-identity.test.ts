//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { failedInvariant } from '@dxos/invariant';
import { subscribeStream } from '@dxos/protocols';
import { type Identity } from '@dxos/protocols/buf/dxos/client/services_pb';

import { type ServiceContext, createServiceContext } from '../testing/index.ts';
import { IdentityServiceImpl } from './identity-service.ts';

/** Every table {@link wipeSqliteStorage} clears, grouped by the subsystem that owns it. */
const STORAGE_TABLES = {
  automerge: ['automerge_chunks', 'automerge_heads'],
  hypercore: ['hypercore_files'],
  feeds: ['feeds', 'blocks', 'subscriptions', 'cursor_tokens', 'sync_state'],
  indexer: ['indexCursor', 'objectMeta', 'reverseRef', 'ftsIndex'],
  keyring: ['keyring'],
  metadata: ['space_metadata', 'space_large'],
} as const;

describe('IdentityService.deleteIdentity', () => {
  let serviceContext: ServiceContext;
  let identityService: IdentityServiceImpl;

  beforeEach(async () => {
    serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    identityService = new IdentityServiceImpl(
      serviceContext.identityManager,
      serviceContext.recoveryManager,
      serviceContext.keyring,
      serviceContext.dataSpaceManager ?? failedInvariant(),
      (options) => serviceContext.createIdentity(options),
    );
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  const deleteIdentity = () => EffectEx.runPromise(identityService['IdentityService.deleteIdentity']());

  const createIdentity = () => EffectEx.runPromise(identityService['IdentityService.createIdentity']({}));

  /**
   * Row counts per table, so an assertion can name which subsystem still holds data. Takes the
   * client rather than resolving it per call: a reset tears the stack down, and the SQLite runtime
   * behind it outlives that.
   */
  const countRows = async (
    sql: SqlClient.SqlClient,
    tables: readonly string[],
  ): Promise<Record<string, number>> => {
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await EffectEx.runPromise(sql.unsafe<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`));
      counts[table] = Number(rows[0].count);
    }
    return counts;
  };

  const allZero = (tables: readonly string[]) =>
    Object.fromEntries(tables.map((table) => [table, 0])) as Record<string, number>;

  test('closes and deletes the identity', async () => {
    await createIdentity();
    expect(serviceContext.identityManager.identity).to.exist;

    await deleteIdentity();

    expect(serviceContext.identityManager.identity).to.be.undefined;
    expect(serviceContext.metadataStore.getIdentityRecord()).to.be.undefined;
  });

  test('queryIdentity reports the identity as gone', async () => {
    await createIdentity();

    const gone = new Trigger<Identity | undefined>();
    const cleanup = subscribeStream(EffectContext.empty(), identityService['IdentityService.queryIdentity'](), {
      onData: ({ identity }) => !identity && gone.wake(undefined),
    });
    try {
      await deleteIdentity();
      expect(await gone.wait({ timeout: 1_000 })).to.be.undefined;
    } finally {
      cleanup();
    }
  });

  test('closes and deletes all spaces', async () => {
    await createIdentity();
    const dataSpaceManager = serviceContext.dataSpaceManager ?? failedInvariant();
    const first = await dataSpaceManager.createSpace(new Context());
    const second = await dataSpaceManager.createSpace(new Context());
    expect(dataSpaceManager.spaces.size).to.equal(2);

    await deleteIdentity();

    expect(dataSpaceManager.spaces.size).to.equal(0);
    expect(first.isOpen).to.be.false;
    expect(second.isOpen).to.be.false;
  });

  test('is a no-op when there is no identity', async () => {
    await deleteIdentity();
    expect(serviceContext.identityManager.identity).to.be.undefined;
  });

  test('a second call after the identity is gone still succeeds', async () => {
    await createIdentity();
    await deleteIdentity();
    await deleteIdentity();
    expect(serviceContext.identityManager.identity).to.be.undefined;
  });

  test('an identity can be created again after deletion', async () => {
    const first = await createIdentity();
    await deleteIdentity();

    const second = await createIdentity();
    expect(second.identityKey).to.not.deep.equal(first.identityKey);
  });

  test('removes the automerge documents, hypercore files, feeds, index tables and keys', async () => {
    await createIdentity();
    const dataSpaceManager = serviceContext.dataSpaceManager ?? failedInvariant();
    await dataSpaceManager.createSpace(new Context());

    const sql = EffectContext.get(serviceContext.stack, SqlClient.SqlClient);
    const written = await countRows(sql, [...STORAGE_TABLES.automerge, ...STORAGE_TABLES.keyring]);
    // Guards the assertion below: an empty store would pass the wipe check for the wrong reason.
    expect(written.automerge_chunks).to.be.greaterThan(0);
    expect(written.keyring).to.be.greaterThan(0);

    await deleteIdentity();
    // Storage is the host's, not the identity service's: the client runs the reset chain next.
    await serviceContext.reset();

    const tables = Object.values(STORAGE_TABLES).flat();
    expect(await countRows(sql, tables)).to.deep.equal(allZero(tables));
  });
});
