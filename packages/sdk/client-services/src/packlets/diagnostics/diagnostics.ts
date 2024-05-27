//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { type ClientServices } from '@dxos/client-protocol';
import { getFirstStreamValue } from '@dxos/codec-protobuf';
import { type Config, type ConfigProto } from '@dxos/config';
import { credentialTypeFilter } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { STORAGE_VERSION } from '@dxos/protocols';
import {
  SpaceMember,
  type Device,
  type Identity,
  type LogEntry,
  type Metrics,
  type NetworkStatus,
  type Platform,
  type Space as SpaceProto,
} from '@dxos/protocols/proto/dxos/client/services';
import { type SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { type SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type Resource, type Span } from '@dxos/protocols/proto/dxos/tracing';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { DXOS_VERSION } from '../../version';
import { type ServiceContext } from '../services';
import { getPlatform } from '../services/platform';
import { type DataSpace } from '../spaces';

const DEFAULT_TIMEOUT = 1_000;

export type Diagnostics = {
  client: {
    config: ConfigProto;
    trace: TraceDiagnostic;
  };
  services: {
    trace: TraceDiagnostic;
    created: string;
    platform: Platform;
    config?: ConfigProto;
    client: {
      version: string;
      storage: {
        version: number;
      };
    };
    identity?: Identity;
    devices?: Device[];
    spaces?: SpaceStats[];
    networkStatus?: NetworkStatus;
    swarms?: SwarmInfo[];
    feeds?: Partial<SubscribeToFeedsResponse.Feed>[];
    metrics?: Metrics;
    storage?: { file: string; count: number }[];
  };
};

export type TraceDiagnostic = {
  resources: Record<string, Resource>;
  spans: Span[];
  logs: LogEntry[];
};

// TODO(burdon): Normalize for ECHO/HALO.
export type SpaceStats = {
  key: PublicKey;
  properties?: {
    name: string;
  };
  db?: {
    objects: number;
  };
  metrics?: SpaceProto.Metrics & {
    startupTime?: number;
  };
  epochs?: (Epoch & { id?: PublicKey })[];
  members?: SpaceMember[];
  pipeline?: SpaceProto.PipelineState;
};

/**
 * Create diagnostics to provide snapshot of current system state.
 */
export const createDiagnostics = async (
  clientServices: Partial<ClientServices>,
  serviceContext: ServiceContext,
  config: Config,
): Promise<Diagnostics['services']> => {
  const diagnostics: Diagnostics['services'] = {
    created: new Date().toISOString(),
    platform: getPlatform(),
    client: {
      version: DXOS_VERSION,
      storage: {
        version: STORAGE_VERSION,
      },
    },
    trace: TRACE_PROCESSOR.getDiagnostics(),
  };

  await Promise.all([
    (async () => {
      // Trace metrics.
      // TODO(burdon): Move here from logging service?
      invariant(clientServices.LoggingService, 'SystemService is not available.');
      diagnostics.metrics = await getFirstStreamValue(clientServices.LoggingService.queryMetrics({}), {
        timeout: DEFAULT_TIMEOUT,
      }).catch(() => undefined);
    })(),
    (async () => {
      diagnostics.storage = await asyncTimeout(getStorageDiagnostics(), DEFAULT_TIMEOUT).catch(() => undefined);
    })(),
    async () => {
      const identity = serviceContext.identityManager.identity;
      if (identity) {
        // Identity.
        diagnostics.identity = {
          identityKey: identity.identityKey,
          spaceKey: identity.space.key,
          profile: identity.profileDocument,
        };

        // Devices.
        const { devices } =
          (await getFirstStreamValue(clientServices.DevicesService!.queryDevices(), {
            timeout: DEFAULT_TIMEOUT,
          }).catch(() => undefined)) ?? {};
        diagnostics.devices = devices;

        // TODO(dmaretskyi): Add metrics for halo space.

        // Spaces.
        if (serviceContext.dataSpaceManager) {
          diagnostics.spaces = await Promise.all(
            Array.from(serviceContext.dataSpaceManager.spaces.values()).map((space) => getSpaceStats(space)) ?? [],
          );
        }

        // Feeds.
        const { feeds = [] } =
          (await getFirstStreamValue(clientServices.DevtoolsHost!.subscribeToFeeds({}), {
            timeout: DEFAULT_TIMEOUT,
          }).catch(() => undefined)) ?? {};
        diagnostics.feeds = feeds.map(({ feedKey, bytes, length }) => ({ feedKey, bytes, length }));

        // Signal servers.

        const status = await getFirstStreamValue(clientServices.NetworkService!.queryStatus(), {
          timeout: DEFAULT_TIMEOUT,
        }).catch(() => undefined);
        diagnostics.networkStatus = status;

        // Networking.

        diagnostics.swarms = serviceContext.networkManager.connectionLog?.swarms;
      }
    },
  ]);

  diagnostics.config = config.values;

  return diagnostics;
};

const getSpaceStats = async (space: DataSpace): Promise<SpaceStats> => {
  const stats: SpaceStats = {
    key: space.key,
    metrics: space.metrics,

    epochs: space.inner.spaceState.credentials
      .filter(credentialTypeFilter('dxos.halo.credentials.Epoch'))
      .map((credential) => ({
        ...credential.subject.assertion,
        id: credential.id,
      })),

    members: Array.from(space.inner.spaceState.members.values()).map((member) => ({
      role: member.role,
      identity: {
        identityKey: member.key,
        profile: {
          displayName: member.assertion.profile?.displayName,
        },
      },
      presence:
        space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key)).length > 0
          ? SpaceMember.PresenceState.ONLINE
          : SpaceMember.PresenceState.OFFLINE,
    })),

    pipeline: {
      // TODO(burdon): Pick properties from credentials if needed.
      currentEpoch: space.automergeSpaceState.lastEpoch,
      appliedEpoch: space.automergeSpaceState.lastEpoch,

      controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => feed.key),
      currentControlTimeframe: space.inner.controlPipeline.state.timeframe,
      targetControlTimeframe: space.inner.controlPipeline.state.targetTimeframe,
      totalControlTimeframe: space.inner.controlPipeline.state.endTimeframe,
    },
  };

  // TODO(burdon): Factor out.
  if (stats.metrics) {
    const { open, ready } = stats.metrics;
    stats.metrics.startupTime = open && ready && ready.getTime() - open.getTime();
  }

  return stats;
};

const getStorageDiagnostics = async () => {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return undefined;
  }
  const map = new Map();
  const dir = await navigator.storage.getDirectory();
  for await (const filename of (dir as any)?.keys()) {
    const idx = filename.indexOf('-', filename.indexOf('-') + 1);
    if (idx === -1) {
      continue;
    }

    map.set(filename.slice(0, idx), (map.get(filename.slice(0, idx)) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([file, count]) => ({ file, count }));
};
