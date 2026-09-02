//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type Client, type ClientServices } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
// Value imports come straight from protocols: reaching them through the `@dxos/client` barrels
// puts echo-client (and wa-sqlite, automerge-repo with it) in the app's eager boot graph.
import {
  ConnectionState,
  DeviceKind,
  type NetworkStatus,
  Platform,
  SpaceState,
} from '@dxos/protocols/proto/dxos/client/services';

import * as Observability from '../Observability';
import { type CrossRealmMemory, measureCrossRealmMemory, readHeap, supportsCrossRealmMemory } from './memory';
import { SyncEpisodeTracker } from './sync-episodes';
import { subscribeSyncSummary } from './sync-state';

const SPACE_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes
const NETWORK_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes
const RUNTIME_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes

/** Under the 60s export interval, so an observed gauge never reports a stale sample. */
const MEMORY_SAMPLE_INTERVAL = 1000 * 30;

const BYTES = { unit: 'By' } as const;
const SPACES = { unit: '{space}' } as const;
const DOCUMENTS = { unit: '{document}' } as const;
const SECONDS = { unit: 's' } as const;

// TODO(wittjosiah): Improve privacy of telemetry identifiers.
//  - Identifier should be generated client-side with no attachment to identity.
//  - Identifier can then be reset by user.
//  - Identifier can be synced via HALO to allow for correlation of events bewteen devices.
//  - Identifier should also be stored outside of HALO such that it is available immediately on startup.
/** Subscribes to identity and device changes and sets observability tags accordingly. */
export const identityProvider = (clientServices: Partial<ClientServices>): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    // TODO(wittjosiah): RPC subscribe returns void; cleanup requires upstream API change.
    clientServices.IdentityService!.queryIdentity().subscribe((idqr) => {
      if (!idqr?.identity?.did) {
        return;
      }

      observability.identify(idqr.identity.did);
      observability.setTags({ identityDid: idqr.identity.did });
    });

    // TODO(wittjosiah): RPC subscribe returns void; cleanup requires upstream API change.
    clientServices.DevicesService!.queryDevices().subscribe((dqr) => {
      if (!dqr?.devices || dqr.devices.length === 0) {
        return;
      }

      const thisDevice = dqr.devices.find((device) => device.kind === DeviceKind.CURRENT);
      if (!thisDevice) {
        return;
      }

      observability.setTags({ deviceKey: thisDevice.deviceKey.truncate() });
      if (thisDevice.profile?.label) {
        observability.setTags({ deviceProfile: thisDevice.profile.label });
      }
    });
  });

/**
 * What {@link identityManagerProvider} reads: the host-side identity manager, in a realm that has no
 * client proxy to subscribe through.
 */
export type IdentitySource = {
  readonly identity: { readonly did: string } | undefined;
  readonly stateUpdate: { on(listener: () => void): unknown };
};

/**
 * Tags every span and log of a realm with the identity, read from the services host itself. For the
 * dedicated worker, whose tracer and tags are its own: the tab's {@link identityProvider} only tags
 * the tab. Tags only — the tab already identifies the user with the analytics backend.
 */
export const identityManagerProvider = (identityManager: IdentitySource): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const apply = () => {
      const did = identityManager.identity?.did;
      if (did) {
        observability.setTags({ identityDid: did });
      }
    };
    identityManager.stateUpdate.on(apply);
    apply();
  });

/** Periodically publishes network connection and buffer metrics. */
export const networkMetricsProvider = (clientServices: Partial<ClientServices>): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    let lastNetworkStatus: NetworkStatus | undefined;

    // TODO(nf): support type in debounce()
    const updateSignalMetrics = new Event<NetworkStatus>().debounce(NETWORK_METRICS_MIN_INTERVAL);
    updateSignalMetrics.on(ctx, async () => {
      log('send signal metrics');
      (lastNetworkStatus?.signaling as NetworkStatus.Signal[])?.forEach(({ server, state }) => {
        observability.metrics.gauge('dxos.client.network.signal.connectionState', state, { server });
      });

      let swarmCount = 0;
      const connectionStates = new Map<string, number>();
      for (const state in ConnectionState) {
        connectionStates.set(state, 0);
      }

      let totalReadBufferSize = 0;
      let totalWriteBufferSize = 0;
      let totalChannelBufferSize = 0;

      lastNetworkStatus?.connectionInfo?.forEach((connectionInfo) => {
        swarmCount++;

        for (const conn of connectionInfo.connections ?? []) {
          connectionStates.set(conn.state, (connectionStates.get(conn.state) ?? 0) + 1);
          totalReadBufferSize += conn.readBufferSize ?? 0;
          totalWriteBufferSize += conn.writeBufferSize ?? 0;
          for (const stream of conn.streams ?? []) {
            totalChannelBufferSize += stream.writeBufferSize ?? 0;
          }
        }

        observability.metrics.gauge('dxos.client.network.swarm.count', swarmCount);
        for (const state in ConnectionState) {
          observability.metrics.gauge('dxos.client.network.connection.count', connectionStates.get(state) ?? 0, {
            state,
          });
        }
        observability.metrics.gauge('dxos.client.network.totalReadBufferSize', totalReadBufferSize);
        observability.metrics.gauge('dxos.client.network.totalWriteBufferSize', totalWriteBufferSize);
        observability.metrics.gauge('dxos.client.network.totalChannelBufferSize', totalChannelBufferSize);
      });
    });

    clientServices.NetworkService!.queryStatus().subscribe((networkStatus) => {
      lastNetworkStatus = networkStatus;
      updateSignalMetrics.emit();
    });

    scheduleTaskInterval(ctx, async () => updateSignalMetrics.emit(), NETWORK_METRICS_MIN_INTERVAL);

    return async () => {
      await ctx.dispose();
    };
  });

/** Periodically publishes platform and heap memory metrics. */
export const runtimeMetricsProvider = (clientServices: Partial<ClientServices>): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    log('runtimeMetricsProvider: requesting platform from SystemService');
    const platform = yield* Effect.promise(() => clientServices.SystemService!.getPlatform());
    log('runtimeMetricsProvider: platform received');
    invariant(platform, 'platform is required');

    observability.setTags({
      platformType: Platform.PLATFORM_TYPE[platform.type as number].toLowerCase(),
      platform: platform.platform,
      arch: platform.arch,
      runtime: platform.runtime,
    });

    // Heap is a synchronous read, so the gauge reads it directly at collection time.
    const heapGauges = [
      ['dxos.client.runtime.heapUsed', () => readHeap().used],
      ['dxos.client.runtime.heapTotal', () => readHeap().total],
      ['dxos.client.runtime.heapSizeLimit', () => readHeap().limit],
    ] as const;
    for (const [name, read] of heapGauges) {
      ctx.onDispose(observability.metrics.observe(name, read, undefined, BYTES));
    }

    // The platform reading is an RPC and cross-realm memory waits for a GC, so both are sampled on
    // their own cadence and the gauges read the latest sample.
    let platformMemory: Platform['memory'];
    let crossRealmMemory: CrossRealmMemory | undefined;

    const servicesGauges = [
      ['dxos.client.services.runtime.heapUsed', () => platformMemory?.heapUsed],
      ['dxos.client.services.runtime.heapTotal', () => platformMemory?.heapTotal],
      ['dxos.client.services.runtime.rss', () => platformMemory?.rss],
    ] as const;
    for (const [name, read] of servicesGauges) {
      ctx.onDispose(observability.metrics.observe(name, read, undefined, BYTES));
    }

    if (supportsCrossRealmMemory()) {
      for (const scope of ['window', 'shared-worker', 'dedicated-worker', 'other'] as const) {
        ctx.onDispose(
          observability.metrics.observe(
            'dxos.client.runtime.memory.bytes',
            () => crossRealmMemory?.[scope],
            { scope },
            BYTES,
          ),
        );
      }
    }

    const sample = async () => {
      try {
        const platform = await clientServices.SystemService?.getPlatform();
        platformMemory = platform?.memory;
      } catch (error) {
        log('platform error', { error });
      }

      try {
        crossRealmMemory = await measureCrossRealmMemory();
      } catch (error) {
        // Not cross-origin isolated, or a measurement is already in flight; neither is retryable here.
        log('cross-realm memory unavailable', { error });
      }
    };

    scheduleTaskInterval(ctx, sample, MEMORY_SAMPLE_INTERVAL);
    void sample();

    return async () => {
      await ctx.dispose();
    };
  });

/** Periodically publishes space membership, object count, and pipeline progress metrics. */
export const spacesMetricsProvider = (client: Client): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    // Pipeline subscriptions only; the gauges below read the live space list at collection time.
    const spaces = client.spaces.get();
    const subscriptions = new Map<string, { unsubscribe: () => void }>();
    ctx.onDispose(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));

    // Read at collection time. The gap between the two is the "known but not opened" signal.
    ctx.onDispose(
      observability.metrics.observe('dxos.client.spaces.count', () => client.spaces.get().length, undefined, SPACES),
    );
    ctx.onDispose(
      observability.metrics.observe(
        'dxos.client.spaces.ready.count',
        () => client.spaces.get().filter((space) => space.state.get() === SpaceState.SPACE_READY).length,
        undefined,
        SPACES,
      ),
    );

    const updateSpaceMetrics = new Event<Space>().debounce(SPACE_METRICS_MIN_INTERVAL);
    updateSpaceMetrics.on(ctx, async () => {
      log('send space metrics');
      // Reported as device-wide totals rather than per space: the previous `key` attribute cost one
      // series per space per device, unbounded in the number of spaces a user creates.
      const mapped = mapSpaces(client.spaces.get(), { truncateKeys: true });
      const total = (pick: (data: (typeof mapped)[number]) => number | undefined) =>
        mapped.reduce((sum, data) => sum + (pick(data) ?? 0), 0);

      observability.metrics.gauge(
        'dxos.client.space.members',
        total((data) => data.members),
      );
      observability.metrics.gauge(
        'dxos.client.space.objects',
        total((data) => data.objects),
      );
      observability.metrics.gauge(
        'dxos.client.space.currentDataMutations',
        total((data) => data.currentDataMutations),
      );
      // Max, not a sum: epochs are per-space sequence numbers, so adding them means nothing.
      observability.metrics.gauge(
        'dxos.client.space.epoch',
        mapped.reduce((max, data) => Math.max(max, data.epoch ?? 0), 0),
      );
    });

    const subscribeToSpaceUpdate = (space: Space) =>
      space.pipeline.subscribe({
        next: () => {
          updateSpaceMetrics.emit();
        },
      });

    spaces.forEach((space) => {
      subscriptions.set(space.id, subscribeToSpaceUpdate(space));
    });

    client.spaces.subscribe({
      next: async (spaces) => {
        spaces
          .filter((space) => !subscriptions.has(space.id))
          .forEach((space) => {
            subscriptions.set(space.id, subscribeToSpaceUpdate(space));
          });
      },
    });

    scheduleTaskInterval(ctx, async () => updateSpaceMetrics.emit(), SPACE_METRICS_MIN_INTERVAL);

    return async () => {
      await ctx.dispose();
    };
  });

/** Publishes the document backlog folded across every space. */
export const documentsMetricsProvider = (client: Client): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    const { summary } = subscribeSyncSummary(client, ctx);

    ctx.onDispose(
      observability.metrics.observe(
        'dxos.echo.documents.count',
        () => summary().localDocumentCount,
        { location: 'local' },
        DOCUMENTS,
      ),
    );
    ctx.onDispose(
      observability.metrics.observe(
        'dxos.echo.documents.count',
        () => summary().remoteDocumentCount,
        { location: 'remote' },
        DOCUMENTS,
      ),
    );
    ctx.onDispose(
      observability.metrics.observe(
        'dxos.echo.documents.unsynced.count',
        () => summary().unsyncedDocumentCount,
        undefined,
        DOCUMENTS,
      ),
    );

    return async () => {
      await ctx.dispose();
    };
  });

/**
 * Publishes how long a client takes to sync, and how long it has been stuck.
 *
 * Both are needed. `episode.duration` records only when a backlog clears, so a client that never
 * finishes syncing contributes nothing to it — `stalled.duration` is what makes that client visible.
 */
export const syncMetricsProvider = (client: Client): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    const episodes = new SyncEpisodeTracker();
    let pending = 0;

    // Fed on every sync-state emission rather than at collection time: an episode that opens and
    // closes inside one 60s export window would otherwise never be seen at all.
    subscribeSyncSummary(client, ctx, (summary) => {
      pending = summary.pendingWorkCount;
      const closed = episodes.observe(Date.now(), summary.pendingWorkCount);
      if (closed) {
        log('sync episode closed', { durationMs: closed.durationMs, truncated: closed.truncated });
        observability.metrics.distribution(
          'dxos.echo.sync.episode.duration',
          closed.durationMs / 1_000,
          undefined,
          SECONDS,
        );
      }
    });

    ctx.onDispose(
      observability.metrics.observe('dxos.echo.sync.pending.count', () => pending, undefined, { unit: '{item}' }),
    );
    ctx.onDispose(
      observability.metrics.observe(
        'dxos.echo.sync.stalled.duration',
        () => episodes.stalledForMs(Date.now()) / 1_000,
        undefined,
        SECONDS,
      ),
    );

    return async () => {
      await ctx.dispose();
    };
  });

type MapSpacesOptions = {
  verbose?: boolean;
  truncateKeys?: boolean;
};

const mapSpaces = (spaces: Space[], options: MapSpacesOptions = { verbose: false, truncateKeys: false }) => {
  return spaces.map((space) => {
    // TODO(burdon): Factor out.
    // TODO(burdon): Agent needs to restart before `ready` is available.
    const { open, ready } = space.internal.data.metrics ?? {};
    const startup = open && ready && ready.getTime() - open.getTime();

    // TODO(burdon): Get feeds from client-services if verbose (factor out from devtools/diagnostics).
    // const host = client.services.services.DevtoolsHost!;
    const pipeline = space.internal.data.pipeline;
    const startDataMutations = pipeline?.currentEpoch?.subject.assertion.timeframe.totalMessages() ?? 0;
    const epoch = pipeline?.currentEpoch?.subject.assertion.number;
    // const appliedEpoch = pipeline?.appliedEpoch?.subject.assertion.number;
    const currentDataMutations = pipeline?.currentDataTimeframe?.totalMessages() ?? 0;
    const totalDataMutations = pipeline?.targetDataTimeframe?.totalMessages() ?? 0;

    return {
      // TODO(nf): truncate keys for DD?
      key: space.key.truncate(),
      open: space.isOpen,
      members: space.members.get().length,
      objects: space.internal.db.getAllObjectIds().length,
      startup,
      epoch,
      // appliedEpoch,
      startDataMutations,
      currentDataMutations,
      totalDataMutations,

      // TODO(burdon): Negative?
      progress: (
        Math.min(Math.abs((currentDataMutations - startDataMutations) / (totalDataMutations - startDataMutations)), 1) *
        100
      ).toFixed(0),
    };
  });
};
