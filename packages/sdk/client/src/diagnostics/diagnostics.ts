//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { asyncTimeout, Trigger } from '@dxos/async';
import { Space } from '@dxos/client-protocol';
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

// TODO(burdon): Move to Client/Services.
export const createDiagnostics = async (client: Client, options: DiagnosticOptions): Promise<Diagnostics> => {
  const identity = client.halo.identity.get();
  log('diagnostics...', { identity });

  const data: Diagnostics = {
    created: new Date().toISOString(),
    platform: getPlatform(),
    client: {
      version: client.version,
      storage: {
        version: STORAGE_VERSION,
      },
    },

    // TODO(burdon): Are these the same?
    // config: await client.services.services.SystemService?.getConfig(),
    config: client.config.values,
  };

  // Trace metrics.
  {
    invariant(client.services.services.SystemService, 'SystemService is not available.');
    const stream = client.services.services.LoggingService!.queryMetrics({});
    const trigger = new Trigger<Metrics>();
    stream?.subscribe(async (metrics) => trigger.wake(metrics!));
    data.metrics = await asyncTimeout(trigger.wait(), DEFAULT_DIAGNOSTICS_TIMEOUT).catch((err) => {
      log.warn('Metics take to long to query.');
      return undefined;
    });
  }

  if (identity) {
    const host = client.services.services.DevtoolsHost!;
    Object.assign(data, {
      identity,
      devices: client.halo.devices.get(),
    });

    // Spaces.
    {
      const done = new Trigger();
      const stream = host.subscribeToSpaces({});
      stream.subscribe(async ({ spaces = [] }) => {
        data.spaces = await Promise.all(spaces.map(async (info) => await getSpaceStats(client, info)));
        done.wake();
      });

      await done.wait();
      stream.close();
    }

    // Feeds.
    {
      const done = new Trigger();
      const stream = host.subscribeToFeeds({});
      stream.subscribe(({ feeds = [] }) => {
        data.feeds = feeds.map(({ feedKey, bytes, length }) => ({ feedKey, bytes, length }));
        done.wake();
      });

      await done.wait();
      stream.close();
    }
  }

  return jsonStringify(data, options) as Diagnostics;
};

// TODO(burdon): Normalize for ECHO/HALO.
const getSpaceStats = async (client: Client, info: SubscribeToSpacesResponse.SpaceInfo): Promise<SpaceStats> => {
  const identity = client.halo.identity.get();
  const type = info.key.equals(identity!.spaceKey!) ? 'halo' : 'echo';
  const stats: SpaceStats = { type, info };

  // TODO(burdon): Process HALO pipeline also.
  if (type === 'echo' && info.isOpen) {
    const space = client.getSpace(info.key);
    invariant(space);
    await asyncTimeout(space.waitUntilReady(), DEFAULT_DIAGNOSTICS_TIMEOUT).catch((err) => {
      log.warn('Space takes to long to get ready.s');
    });

    // TODO(burdon): Other stats from internal.data.
    Object.assign(stats, {
      properties: {
        name: space.properties.name,
      },
      metrics: space.internal.data.metrics,
      db: {
        objects: space.db.objects.length,
      },
      epochs: await getEpochs(client.services.services.SpacesService!, space),
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
  }

  return stats;
};

const getEpochs = async (service: SpacesService, space: Space): Promise<SpaceStats['epochs']> => {
  const epochs: SpaceStats['epochs'] = [];
  const currentEpoch = space.internal.data.pipeline!.currentEpoch;
  if (currentEpoch) {
    const done = new Trigger();
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
      log.warn('Epochs take to long to query.');
    });
    stream.close();
  }

  return epochs;
};
