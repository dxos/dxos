//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type Client, type ClientServices } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { DeviceKind } from '@dxos/client/halo';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ConnectionState, type NetworkStatus, Platform } from '@dxos/protocols/proto/dxos/client/services';

import { type DataProvider } from '../observability';

const SPACE_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes
const NETWORK_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes
const RUNTIME_METRICS_MIN_INTERVAL = 1000 * 60 * 10; // 10 minutes

// TODO(wittjosiah): Improve privacy of telemetry identifiers.
//  - Identifier should be generated client-side with no attachment to identity.
//  - Identifier can then be reset by user.
//  - Identifier can be synced via HALO to allow for correlation of events bewteen devices.
//  - Identifier should also be stored outside of HALO such that it is available immediately on startup.
export const identityProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    // TODO(wittjosiah): Currently cannot unsubscribe from this subscription.
    clientServices.IdentityService!.queryIdentity().subscribe((idqr) => {
      if (!idqr?.identity?.did) {
        return;
      }

      observability.identify(idqr.identity.did);
      observability.setTags({ did: idqr.identity.did });
    });

    // TODO(wittjosiah): Currently cannot unsubscribe from this subscription.
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

export const networkMetricsProvider = (clientServices: Partial<ClientServices>): DataProvider =>
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

export const runtimeMetricsProvider = (clientServices: Partial<ClientServices>): DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    const platform = yield* Effect.promise(() => clientServices.SystemService!.getPlatform());
    invariant(platform, 'platform is required');

    observability.setTags({
      platformType: Platform.PLATFORM_TYPE[platform.type as number].toLowerCase(),
      platform: platform.platform,
      arch: platform.arch,
      runtime: platform.runtime,
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
          .then((platform) => {
            if (platform.memory) {
              observability.metrics.gauge('dxos.client.services.runtime.rss', platform.memory.rss);
              observability.metrics.gauge('dxos.client.services.runtime.heapTotal', platform.memory.heapTotal);
              observability.metrics.gauge('dxos.client.services.runtime.heapUsed', platform.memory.heapUsed);
            }
          })
          .catch((error) => log('platform error', { error }));
      },
      RUNTIME_METRICS_MIN_INTERVAL,
    );

    return async () => {
      await ctx.dispose();
    };
  });

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

    scheduleTaskInterval(ctx, async () => updateSpaceMetrics.emit(), NETWORK_METRICS_MIN_INTERVAL);

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
      objects: space.db.coreDatabase.getAllObjectIds().length,
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
