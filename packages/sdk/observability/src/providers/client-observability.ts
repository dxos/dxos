//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type Client, type ClientServices } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { DeviceKind } from '@dxos/client/halo';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Timestamp } from '@dxos/protocols/buf';
import { ConnectionState, type NetworkStatus, type NetworkStatus_Signal, Platform_PLATFORM_TYPE } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type TimeframeVector } from '@dxos/protocols/buf/dxos/echo/timeframe_pb';

import { type DataProvider } from '../observability';

const SPACE_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes
const NETWORK_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes
const RUNTIME_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes

const timestampToMs = (ts: Timestamp | undefined): number | undefined => {
  if (!ts) {
    return undefined;
  }
  return Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
};

const timeframeVectorTotalMessages = (tf: TimeframeVector | undefined): number => {
  if (!tf?.frames) {
    return 0;
  }
  return tf.frames.reduce((total, frame) => total + frame.seq + 1, 0);
};

// TODO(wittjosiah): Improve privacy of telemetry identifiers.
//  - Identifier should be generated client-side with no attachment to identity.
//  - Identifier can then be reset by user.
//  - Identifier can be synced via HALO to allow for correlation of events bewteen devices.
//  - Identifier should also be stored outside of HALO such that it is available immediately on startup.
/** Subscribes to identity and device changes and sets observability tags accordingly. */
export const identityProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    // TODO(wittjosiah): RPC subscribe returns void; cleanup requires upstream API change.
    clientServices.IdentityService!.queryIdentity().subscribe((idqr: any) => {
      if (!idqr?.identity?.did) {
        return;
      }

      observability.identify(idqr.identity.did);
      observability.setTags({ did: idqr.identity.did });
    });

    // TODO(wittjosiah): RPC subscribe returns void; cleanup requires upstream API change.
    clientServices.DevicesService!.queryDevices().subscribe((dqr: any) => {
      if (!dqr?.devices || dqr.devices.length === 0) {
        return;
      }

      const thisDevice = dqr.devices.find((device: any) => device.kind === DeviceKind.CURRENT);
      if (!thisDevice) {
        return;
      }

      observability.setTags({ deviceKey: thisDevice.deviceKey.truncate() });
      if (thisDevice.profile?.label) {
        observability.setTags({ deviceProfile: thisDevice.profile.label });
      }
    });
  });

/** Periodically publishes network connection and buffer metrics. */
export const networkMetricsProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    let lastNetworkStatus: NetworkStatus | undefined;

    // TODO(nf): support type in debounce()
    const updateSignalMetrics = new Event<NetworkStatus>().debounce(NETWORK_METRICS_MIN_INTERVAL);
    updateSignalMetrics.on(ctx, async () => {
      log('send signal metrics');
      (lastNetworkStatus?.signaling as NetworkStatus_Signal[])?.forEach(({ server, state }) => {
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

    clientServices.NetworkService!.queryStatus().subscribe((networkStatus: any) => {
      lastNetworkStatus = networkStatus;
      updateSignalMetrics.emit();
    });

    scheduleTaskInterval(ctx, async () => updateSignalMetrics.emit(), NETWORK_METRICS_MIN_INTERVAL);

    return async () => {
      await ctx.dispose();
    };
  });

/** Periodically publishes platform and heap memory metrics. */
export const runtimeMetricsProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    const platform = yield* Effect.promise(() => clientServices.SystemService!.getPlatform());
    invariant(platform, 'platform is required');

    const platformAny = platform as any;
    observability.setTags({
      platformType: Platform_PLATFORM_TYPE[platformAny.type as number]?.toLowerCase(),
      platform: platformAny.platform,
      arch: platformAny.arch,
      runtime: platformAny.runtime,
    });

    scheduleTaskInterval(
      ctx,
      async () => {
        if (clientServices.constructor.name === 'WorkerClientServices') {
          const memory = (window.performance as any).memory;
          if (memory) {
            observability.metrics.gauge('dxos.client.runtime.heapTotal', memory.totalJSHeapSize);
            observability.metrics.gauge('dxos.client.runtime.heapUsed', memory.usedJSHeapSize);
            observability.metrics.gauge('dxos.client.runtime.heapSizeLimit', memory.jsHeapSizeLimit);
          }
        }

        clientServices.SystemService?.getPlatform()
          .then((platform: any) => {
            if (platform.memory) {
              observability.metrics.gauge('dxos.client.services.runtime.rss', platform.memory.rss);
              observability.metrics.gauge('dxos.client.services.runtime.heapTotal', platform.memory.heapTotal);
              observability.metrics.gauge('dxos.client.services.runtime.heapUsed', platform.memory.heapUsed);
            }
          })
          .catch((error: any) => log('platform error', { error }));
      },
      RUNTIME_METRICS_MIN_INTERVAL,
    );

    return async () => {
      await ctx.dispose();
    };
  });

/** Periodically publishes space membership, object count, and pipeline progress metrics. */
export const spacesMetricsProvider = (client: Client): DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    // TODO(nf): update subscription on new spaces
    const spaces = client.spaces.get();
    const subscriptions = new Map<string, { unsubscribe: () => void }>();
    ctx.onDispose(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));

    const updateSpaceMetrics = new Event<Space>().debounce(SPACE_METRICS_MIN_INTERVAL);
    updateSpaceMetrics.on(ctx, async () => {
      log('send space metrics');
      for (const data of mapSpaces(spaces, { truncateKeys: true })) {
        observability.metrics.gauge('dxos.client.space.members', data.members, { key: data.key });
        observability.metrics.gauge('dxos.client.space.objects', data.objects, { key: data.key });
        observability.metrics.gauge('dxos.client.space.epoch', data.epoch, { key: data.key });
        observability.metrics.gauge('dxos.client.space.currentDataMutations', data.currentDataMutations, {
          key: data.key,
        });
      }
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

type MapSpacesOptions = {
  verbose?: boolean;
  truncateKeys?: boolean;
};

const mapSpaces = (spaces: Space[], options: MapSpacesOptions = { verbose: false, truncateKeys: false }) => {
  return spaces.map((space) => {
    const { open, ready } = space.internal.data.metrics ?? ({} as any);
    const openMs = timestampToMs(open);
    const readyMs = timestampToMs(ready);
    const startup = openMs && readyMs ? readyMs - openMs : undefined;

    const pipeline = space.internal.data.pipeline;
    const assertion = pipeline?.currentEpoch?.subject?.assertion as any;
    const startDataMutations = assertion?.timeframe
      ? timeframeVectorTotalMessages(assertion.timeframe)
      : 0;
    const epoch = assertion?.number;
    const currentDataMutations = timeframeVectorTotalMessages(pipeline?.currentDataTimeframe);
    const totalDataMutations = timeframeVectorTotalMessages(pipeline?.targetDataTimeframe);

    return {
      key: space.key.truncate(),
      open: space.isOpen,
      members: space.members.get().length,
      objects: space.internal.db.coreDatabase.getAllObjectIds().length,
      startup,
      epoch,
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
