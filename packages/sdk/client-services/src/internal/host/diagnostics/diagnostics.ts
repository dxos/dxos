//
// Copyright 2022 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';

import { asyncTimeout } from '@dxos/async';
import { getFirstStreamValue } from '@dxos/async';
import { type ClientServices, makeClientServicesRpcFromRouter, makeServicesFromRpc } from '@dxos/client-protocol';
import { type Config, type ConfigProto } from '@dxos/config';
import { createDidFromIdentityKey, credentialsOfType } from '@dxos/credentials';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import { STORAGE_VERSION } from '@dxos/protocols';
import { buf, fromPublicKey, fromTimeframe, toDate, toPublicKey } from '@dxos/protocols/buf';
import {
  type Device,
  type Identity,
  IdentitySchema,
  type NetworkStatus,
  type Platform,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type Space_Metrics,
  type Space_PipelineState,
  Space_PipelineStateSchema,
  IdentitySchema as SpaceIdentitySchema,
  type SpaceMember,
  SpaceMember_PresenceState,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type SwarmInfo } from '@dxos/protocols/buf/dxos/devtools/swarm_pb';
import { type Epoch } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type DevtoolsHost, type LoggingService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';

import * as IdentityContract from '../../../contracts/identity.ts';
import * as SpacesContract from '../../../contracts/spaces.ts';
import * as PlatformInfo from '../../../PlatformInfo.ts';
import { DXOS_VERSION } from '../../../version.ts';
import { type DataSpace } from '../../echo/spaces/index.ts';

const DEFAULT_TIMEOUT = 1_000;

export type Diagnostics = {
  client: {
    config: ConfigProto;
  };
  services: {
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
    feeds?: Partial<DevtoolsHost.SubscribeToFeedsResponse.Feed>[];
    metrics?: LoggingService.Metrics;
    storage?: { file: string; count: number }[];
  };
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
  metrics?: Space_Metrics & {
    startupTime?: number;
  };
  epochs?: { epoch: Epoch; id?: PublicKey }[];
  members?: SpaceMember[];
  pipeline?: Space_PipelineState;
};

/**
 * {@link createDiagnostics} over the services registered with a stack's {@link RpcRouter.RpcRouter},
 * bridged in-process for the duration of the collection.
 */
export const createDiagnosticsFromRouter = (
  router: RpcRouter.Service,
  stack: EffectContext.Context<
    IdentityContract.ManagerService | SpacesContract.ManagerService | SwarmNetworkManagerService
  >,
  config: Config,
): Promise<Diagnostics['services']> =>
  EffectEx.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const rpc = yield* makeClientServicesRpcFromRouter.pipe(Effect.provideService(RpcRouter.RpcRouter, router));
        return yield* Effect.promise(() =>
          createDiagnostics(makeServicesFromRpc(rpc, EffectContext.empty()), stack, config),
        );
      }),
    ),
  );

/**
 * Create diagnostics to provide snapshot of current system state.
 */
export const createDiagnostics = async (
  clientServices: Partial<ClientServices>,
  stack: EffectContext.Context<
    IdentityContract.ManagerService | SpacesContract.ManagerService | SwarmNetworkManagerService
  >,
  config: Config,
): Promise<Diagnostics['services']> => {
  const diagnostics: Diagnostics['services'] = {
    created: new Date().toISOString(),
    platform: PlatformInfo.getPlatform(),
    client: {
      version: DXOS_VERSION,
      storage: {
        version: STORAGE_VERSION,
      },
    },
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
    (async () => {
      const identity = EffectContext.get(stack, IdentityContract.ManagerService).identity;
      if (identity) {
        // Identity.
        diagnostics.identity = buf.create(IdentitySchema, {
          did: identity.did,
          identityKey: fromPublicKey(identity.identityKey),
          spaceKey: fromPublicKey(identity.space.key),
          profile: identity.profileDocument,
        });

        // Devices.
        const { devices } =
          (await getFirstStreamValue(clientServices.DevicesService!.queryDevices(), {
            timeout: DEFAULT_TIMEOUT,
          }).catch(() => undefined)) ?? {};
        diagnostics.devices = devices;

        // TODO(dmaretskyi): Add metrics for halo space.

        // Spaces.
        const dataSpaceManager = EffectContext.get(stack, SpacesContract.ManagerService);
        diagnostics.spaces = await Promise.all(
          Array.from(dataSpaceManager.spaces.values()).map((space) => getSpaceStats(space)),
        );

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

        diagnostics.swarms = EffectContext.get(stack, SwarmNetworkManagerService).connectionLog?.swarms;
      }
      // Diagnostics are best-effort: a half-open space or a tag the stack has not built yet must
      // leave the other sections intact rather than failing the whole report.
    })().catch((err) => log.warn('failed to collect identity diagnostics', { err })),
  ]);

  diagnostics.config = config.values;

  return diagnostics;
};

const getSpaceStats = async (space: DataSpace): Promise<SpaceStats> => {
  const stats: SpaceStats = {
    key: space.key,
    metrics: space.metrics,

    epochs: credentialsOfType<Epoch>('dxos.halo.credentials.Epoch')(space.inner.spaceState.credentials).map(
      ({ credential, assertion }) => ({ epoch: assertion, id: toPublicKey(credential.id) }),
    ),

    members: await Promise.all(
      Array.from(space.inner.spaceState.members.values()).map(async (member) =>
        buf.create(SpaceMemberSchema, {
          role: member.role,
          identity: buf.create(SpaceIdentitySchema, {
            did: await createDidFromIdentityKey(member.key),
            identityKey: fromPublicKey(member.key),
            profile: member.assertion.profile,
          }),
          presence:
            space.presence.getPeersByIdentityKey(member.key).length > 0
              ? SpaceMember_PresenceState.ONLINE
              : SpaceMember_PresenceState.OFFLINE,
        }),
      ),
    ),

    pipeline: buf.create(Space_PipelineStateSchema, {
      // TODO(burdon): Pick properties from credentials if needed.
      currentEpoch: space.automergeSpaceState.lastEpoch?.credential,
      appliedEpoch: space.automergeSpaceState.lastEpoch?.credential,

      controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => fromPublicKey(feed.key)),
      currentControlTimeframe: fromTimeframe(space.inner.controlPipeline.state.timeframe),
      targetControlTimeframe: fromTimeframe(space.inner.controlPipeline.state.targetTimeframe),
      totalControlTimeframe: fromTimeframe(space.inner.controlPipeline.state.endTimeframe),
    }),
  };

  // TODO(burdon): Factor out.
  if (stats.metrics) {
    const open = toDate(stats.metrics.open);
    const ready = toDate(stats.metrics.ready);
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
