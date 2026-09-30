//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type LayerStack } from '@dxos/compute-runtime';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { type Config } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, setIdentityTags } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';
import { makeInProcessClient } from '@dxos/protocols';
import { DevicesService, IdentityService } from '@dxos/protocols/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

import * as Events from '../../Events.ts';
import { type ClientServicesStackOptions, enableNetworking } from '../services/index.ts';

// What any worker hosting the client services does, whichever host runs it: `makeWorkerRuntime`,
// or a worker plugin under `@dxos/app-framework/PluginWorker`.

/**
 * Grace period between "worker booted" and the first edge dial. wa-sqlite runs in-process on this
 * thread, so the dial, its auth-header request, and the replication behind it contend with the boot
 * RPCs the tab is waiting on — on a document-heavy profile the session handshake loses that race and
 * the client reports a connect timeout. Yielding lets the queued handshake drain first; replication
 * then proceeds behind a live session. The stack exposes the capability; the embedder decides the timing.
 */
const EDGE_NETWORKING_START_DELAY = '300 millis';

const DB_NAME = 'DXOS';

/** The SQL services the client stack persists through. */
export type SqliteLayer = Layer.Layer<SqlClient.SqlClient | SqlExport.SqlExport, unknown>;

/**
 * SqlExport layer that wraps SqliteClient to provide export functionality.
 */
const SqlExportLayer: Layer.Layer<SqlExport.SqlExport, never, SqliteClient.SqliteClient> = Layer.effect(
  SqlExport.SqlExport,
  Effect.gen(function* () {
    const sql = yield* SqliteClient.SqliteClient;
    return {
      export: sql.export,
    } satisfies SqlExport.Service;
  }),
);

/**
 * Local SQLite layer for the worker.
 * Uses in-process OPFS via {@link SqliteClient.layerOpfs} (no MessagePort).
 * NOTE: Only usable within a worker.
 */
const LocalSqliteOpfsLayer = SqlExportLayer.pipe(
  Layer.provideMerge(SqliteClient.layerOpfs({ dbName: DB_NAME })),
  Layer.provideMerge(Reactivity.layer),
);

/** The worker's SQL services: OPFS-backed unless the embedder supplies its own (tests, in-memory profiles). */
export const layerSqlite = (
  sqliteLayer: SqliteLayer = LocalSqliteOpfsLayer,
): Layer.Layer<SqlClient.SqlClient | SqlExport.SqlExport> =>
  sqliteLayer.pipe(Layer.provideMerge(Reactivity.layer), Layer.orDie);

/** Contributes the SQL services to a stack whose embedder does not provide them ambiently. */
export const SqliteSpec = (sqlite: Layer.Layer<SqlClient.SqlClient | SqlExport.SqlExport>): LayerSpec.LayerSpec =>
  LayerSpec.make(
    { affinity: 'application', requires: [], provides: [SqlClient.SqlClient, SqlExport.SqlExport] },
    () => sqlite,
  );

export type WorkerStackOptions = {
  config: Config;
  /** Proxies WebRTC through a tab, which owns the browser's peer connections. */
  transportFactory: TransportFactory;
  /**
   * Shared context for the in-memory signal manager used when edge signaling is off; tests pass one
   * so several runtimes can see each other.
   */
  memorySignalManagerContext?: MemorySignalManagerContext;
};

/** How a worker builds the client stack: networking held until boot drains, spaces reopened. */
export const workerStackOptions = ({
  config,
  transportFactory,
  memorySignalManagerContext,
}: WorkerStackOptions): ClientServicesStackOptions => ({
  // The dial is driven by {@link openStack} once boot has drained, not on stack open.
  autoConnect: false,
  // Auto-activate spaces that were previously active after leader changeover.
  runtimeProps: { autoActivateSpaces: true },
  // Edge signaling is created by the platform layer from the edge connection; otherwise fall back to
  // an in-memory manager (KUBE `WebsocketSignalManager` removed).
  signalManager: config.get('runtime.client.edgeFeatures')?.signaling
    ? undefined
    : new MemorySignalManager(memorySignalManagerContext ?? new MemorySignalManagerContext()),
  transportFactory,
});

/** Tags attached to signaling telemetry; identity tags are added once the identity is known. */
export const signalMetadataTags = (config: Config): Record<string, string> => {
  const tags: Record<string, string> = {
    runtime: 'worker-runtime',
    origin: typeof location !== 'undefined' ? location.origin : 'unknown',
  };
  const observabilityGroup = config.get('runtime.client.observabilityGroup');
  if (observabilityGroup) {
    tags.group = observabilityGroup;
  }
  return tags;
};

/**
 * Opens a built client stack and schedules networking: `Opening` then `StackOpened` (resolving once
 * every handler the cascade triggered has run), identity tags for signaling telemetry, and the
 * delayed {@link enableNetworking}. The networking start is forked into the scope, so closing it
 * before the delay elapses cancels the dial.
 */
export const openStack = (
  stack: LayerStack.LayerStack,
  tags: Record<string, string>,
): Effect.Effect<void, never, Hook.Controller | Scope.Scope> =>
  Effect.gen(function* () {
    yield* Hook.emit(Events.Opening, undefined);
    yield* Hook.emit(Events.StackOpened, undefined);

    // Bridge the identity/devices Handlers to the effect-rpc client surface in-process.
    const resolver = stack.getServiceResolver();
    const [identityService, devicesService] = yield* Effect.all([
      makeInProcessClient(IdentityService.Rpcs, yield* resolver.resolve(IdentityService.Tag, {}).pipe(Effect.orDie)),
      makeInProcessClient(DevicesService.Rpcs, yield* resolver.resolve(DevicesService.Tag, {}).pipe(Effect.orDie)),
    ]);
    setIdentityTags({
      identityService,
      devicesService,
      setTag: (key: string, value: string) => {
        tags[key] = value;
      },
    });

    // Boot is done: outbound traffic can no longer starve the session handshake the tab is waiting
    // on. The grace period yields the thread so any RPC already queued behind this turn is served
    // before the dial and its auth-header request start competing for it.
    log.info('worker: boot complete, scheduling networking start', { delay: EDGE_NETWORKING_START_DELAY });
    const networkingFiber = yield* Effect.forkDetach(
      Effect.gen(function* () {
        yield* Effect.sleep(EDGE_NETWORKING_START_DELAY);
        log('worker: starting networking');
        yield* enableNetworking;
      }).pipe(Effect.provideService(Hook.Controller, yield* Hook.Controller)),
    );
    yield* Effect.addFinalizer(() => Fiber.interrupt(networkingFiber));
  });

export class OpfsUnavailableError extends BaseError.extend('OpfsUnavailableError', 'OPFS storage is unusable.') {}

const OPFS_PROBE_FILE = '.dxos-opfs-probe';

/** Only the WebWorker lib declares this method, and this package compiles against DOM. */
type SyncAccessFileHandle = FileSystemFileHandle & { createSyncAccessHandle(): Promise<{ close(): void }> };

const hasSyncAccessHandle = (file: FileSystemFileHandle): file is SyncAccessFileHandle =>
  'createSyncAccessHandle' in file && typeof file.createSyncAccessHandle === 'function';

/**
 * Takes and releases the kind of handle the SQLite VFS opens, so an OPFS that cannot serve one is
 * reported here rather than failing every database open for the life of the page. There is no
 * in-memory fallback: it would show none of the stored data and keep nothing written to it.
 */
export const probeOpfs: Effect.Effect<void> = Effect.tryPromise({
  try: async () => {
    const root = await navigator.storage.getDirectory();
    const file = await root.getFileHandle(OPFS_PROBE_FILE, { create: true });
    if (!hasSyncAccessHandle(file)) {
      throw new Error('OPFS has no sync access handles.');
    }
    const handle = await file.createSyncAccessHandle();
    handle.close();
    await root.removeEntry(OPFS_PROBE_FILE).catch((err) => log.warn('OPFS probe file not removed', { err }));
  },
  catch: OpfsUnavailableError.wrap(),
}).pipe(Effect.orDie);
