//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import { runSqliteHealthCheck } from '@dxos/echo-host';
import { Hook, RuntimeProvider } from '@dxos/effect';
import { SqliteKeyring } from '@dxos/keyring';
import { log } from '@dxos/log';
import { InvalidStorageVersionError, STORAGE_VERSION } from '@dxos/protocols';

import * as Events from '../../Events.ts';
import * as SqliteStorage from '../../SqliteStorage.ts';
import { IMetadataStoreService, SqliteMetadataStore } from './metadata/index.ts';

/**
 * Combined storage migration effect gathered from the concrete SQLite stores.
 * Run by the storage lifecycle handler when the host starts opening.
 */
export class StorageMigrationService extends EffectContext.Service<
  StorageMigrationService,
  Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>
>()('@dxos/client-services/StorageMigration') {}

/**
 * Combined storage migration effect. Storage migrations are idempotent `CREATE TABLE` effects that
 * do not depend on store instance state, so they are extracted from throwaway instances to keep the
 * store layers individual.
 */
export const storageMigrationLayer = Layer.effect(
  StorageMigrationService,
  Effect.gen(function* () {
    const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
    return Effect.all(
      [
        new SqliteMetadataStore({ runtime }).migrate,
        new SqliteKeyring({ runtime }).migrate,
        new SqliteStorage.SqliteStorage({ runtime }).migrate,
      ],
      { discard: true },
    );
  }),
);

export const StorageMigrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [SqlClient.SqlClient], provides: [StorageMigrationService] },
  () => storageMigrationLayer,
);

/**
 * Opens storage when the host starts opening: migrations, the storage version check, and the SQLite
 * health check run in this order inside one handler, since a `serial` event would order them by
 * subscription instead.
 */
export const storageLifecycleLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
    const migrate = yield* StorageMigrationService;
    const metadataStore = yield* IMetadataStoreService;
    yield* Hook.on(
      Events.Opening,
      Effect.fn('Storage.onOpening')(function* () {
        log('running storage migrations...');
        yield* Effect.promise(() => RuntimeProvider.runPromise(runtime)(migrate));
        yield* Effect.promise(() => metadataStore.load());
        if (metadataStore.version !== STORAGE_VERSION) {
          // TODO(mykola): Migrate storage to a new version if incompatibility is detected.
          throw new InvalidStorageVersionError(STORAGE_VERSION, metadataStore.version);
        }
        log('running sqlite health check...');
        yield* Effect.promise(() => runSqliteHealthCheck(runtime));
        log('storage ready');
        yield* Hook.emit(Events.StorageReady, undefined);
      }),
    );
  }),
);

/** Eager: it provides no tag, it subscribes to the opening event. */
export const StorageLifecycleSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [SqlClient.SqlClient, StorageMigrationService, IMetadataStoreService, Hook.Controller],
    provides: [],
    eager: true,
  },
  () => storageLifecycleLayer,
);
