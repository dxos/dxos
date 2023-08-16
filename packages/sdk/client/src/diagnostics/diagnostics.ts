//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { asyncTimeout, Trigger } from '@dxos/async';
import { ClientServices, Space } from '@dxos/client-protocol';
import { Stream } from '@dxos/codec-protobuf';
import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';
import {
  Device,
  Identity,
  Metrics,
  Space as SpaceProto,
  SpaceMember,
  SpacesService,
} from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToFeedsResponse, SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { Timeframe } from '@dxos/timeframe';

import { Client } from '../client';
import { DXOS_VERSION } from '../version';
import { getPlatform, Platform } from './platform';
import { jsonStringify, JsonStringifyOptions } from './util';

const DEFAULT_DIAGNOSTICS_TIMEOUT = 1000;

export type Diagnostics = {
  created: string;
  platform: Platform;
  config: ConfigProto;
  client: {
    version: string;
    storage: {
      version: number;
    };
  };
  identity?: Identity;
  devices?: Device[];
  spaces?: SpaceStats[];
  feeds?: Partial<SubscribeToFeedsResponse.Feed>[];
  metrics?: Metrics;
};

// TODO(burdon): Normalize for ECHO/HALO.
export type SpaceStats = {
  type: 'echo' | 'halo';
  info: SubscribeToSpacesResponse.SpaceInfo;
  properties?: {
    name: string;
  };
  metrics?: SpaceProto.Metrics & {
    startupTime?: number;
  };
  db?: {
    objects: number;
  };
  epochs?: { number: number; timeframe: Timeframe }[];
  members?: SpaceMember[];
  feeds?: {
    control: PublicKey[];
    data: PublicKey[];
  };
};

export type DiagnosticOptions = JsonStringifyOptions;

// TODO(burdon): Move to ClientServices.
export const createDiagnostics = async (client: Client, options: DiagnosticOptions): Promise<Diagnostics> => {
  const clientServices: Partial<ClientServices> = client.services.services;

  const config = await clientServices.SystemService!.getConfig();
  const data: Diagnostics = {
    created: new Date().toISOString(),
    platform: getPlatform(),
    client: {
      version: DXOS_VERSION,
      storage: {
        version: STORAGE_VERSION,
      },
    },

    config,
  };

  // Identity
  invariant(clientServices.IdentityService, 'IdentityService is not available.');
  const { identity } = await getOnceFromStream(clientServices.IdentityService.queryIdentity());
  data.identity = identity;

  // TODO(burdon): Trace metrics.
  // {
  //   invariant(clientServices.LoggingService, 'LoggingService is not available.');
  //   const stream = clientServices.LoggingService!.queryMetrics({});
  //   const trigger = new Trigger<Metrics>();
  //   stream?.subscribe(async (metrics) => trigger.wake(metrics!));
  //   data.metrics = await asyncTimeout(trigger.wait(), DEFAULT_DIAGNOSTICS_TIMEOUT).catch((err) => {
  //     log.warn(err.message);
  //     return undefined;
  //   });
  // }

  if (data.identity) {
    // Devices.
    invariant(clientServices.DevicesService, 'DevicesService is not available.');
    const { devices } = await getOnceFromStream(clientServices.DevicesService.queryDevices());
    data.devices = devices;

    // Spaces.
    invariant(clientServices.DevtoolsHost, 'DevtoolsHost is not available.');
    const { spaces = [] } = await getOnceFromStream(clientServices.DevtoolsHost.subscribeToSpaces({}));
    data.spaces = await Promise.all(
      spaces.map(async (info) => {
        const type = info.key.equals(identity!.spaceKey!) ? 'halo' : 'echo';
        const stats: SpaceStats = { type, info };
        if (type === 'echo' && info.isOpen) {
          await getSpaceStats(stats, client, clientServices, info);
        }

        return stats;
      }),
    );

    // Feeds.
    invariant(clientServices.DevtoolsHost, 'DevtoolsHost is not available.');
    const { feeds = [] } = await getOnceFromStream(clientServices.DevtoolsHost.subscribeToFeeds({}));
    data.feeds = feeds.map(({ feedKey, bytes, length }) => ({ feedKey, bytes, length }));
  }

  // TODO(burdon): Move out of this function.
  return jsonStringify(data, options) as Diagnostics;
};

// TODO(burdon): Normalize for ECHO/HALO.
const getSpaceStats = async (
  stats: SpaceStats,
  client: Client,
  clientServices: Partial<ClientServices>,
  info: SubscribeToSpacesResponse.SpaceInfo,
): Promise<SpaceStats> => {
  // TODO(burdon): Factor out client.Space deps.
  const space = client.getSpace(info.key);
  invariant(space);
  await asyncTimeout(space.waitUntilReady(), DEFAULT_DIAGNOSTICS_TIMEOUT).catch((err) => {
    log.warn(err.message);
  });

  // TODO(burdon): Other stats from internal.data?
  Object.assign(stats, {
    properties: {
      name: space.properties.name,
    },
    db: {
      objects: space.db.objects.length,
    },
    metrics: space.internal.data.metrics,
    epochs: await getEpochs(clientServices.SpacesService!, space),
    members: space?.members.get(),
    feeds: {
      control: space.internal.data.pipeline?.controlFeeds ?? [],
      data: space.internal.data.pipeline?.dataFeeds ?? [],
    },
  } satisfies Partial<SpaceStats>);

  // TODO(burdon): Factor out.
  if (stats.metrics) {
    const { open, ready } = stats.metrics;
    stats.metrics.startupTime = open && ready && ready.getTime() - open.getTime();
  }

  return stats;
};

const getEpochs = async (service: SpacesService, space: Space): Promise<SpaceStats['epochs']> => {
  const epochs: SpaceStats['epochs'] = [];
  const currentEpoch = space.internal.data.pipeline!.currentEpoch;
  if (currentEpoch) {
    const done = new Trigger();

    // Process credentials until we find the latest epoch.
    const stream = service.queryCredentials({ spaceKey: space.key });
    stream.subscribe(async (credential) => {
      switch (credential.subject.assertion['@type']) {
        case 'dxos.halo.credentials.Epoch': {
          // TODO(burdon): Epoch number is not monotonic?
          const { number, timeframe } = credential.subject.assertion;
          epochs.push({ number, timeframe });
          if (currentEpoch.id && credential.id!.equals(currentEpoch.id)) {
            done.wake();
          }
          break;
        }
      }
    });

    await asyncTimeout(done.wait(), DEFAULT_DIAGNOSTICS_TIMEOUT).catch((err) => {
      log.warn(err.message);
    });

    stream.close();
  }

  return epochs;
};

// TODO(burdon): Factor out; timeout?
const getOnceFromStream = async <T>(stream: Stream<T>) => {
  const done = new Trigger<T>();
  stream.subscribe(async (value: T) => {
    done.wake(value);
  });

  const result = await done.wait();
  stream.close();
  return result;
};
