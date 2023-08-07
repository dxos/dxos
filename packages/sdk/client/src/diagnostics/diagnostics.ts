//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { Trigger } from '@dxos/async';
import { Space } from '@dxos/client-protocol';
import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { STORAGE_VERSION } from '@dxos/protocols';
import {
  Device,
  Identity,
  Space as SpaceProto,
  SpaceMember,
  SpacesService,
} from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToSpacesResponse, SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { Timeframe } from '@dxos/timeframe';

import { Client } from '../client';
import { jsonStringify, JsonStringifyOptions } from './util';

export type Diagnostics = {
  created: string;
  platform: Platform;
  config: ConfigProto;
  client: {
    version: string;
    storage: number;
  };
  identity?: Identity;
  devices?: Device[];
  spaces?: SpaceStats[];
  feeds?: Partial<SubscribeToFeedsResponse.Feed>[];
};

export type Platform = {
  type: 'browser' | 'node';
  platform: string;
  runtime?: string;
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

// TODO(burdon): Factor out (move into Monitor class).
export const createDiagnostics = async (client: Client, options: DiagnosticOptions): Promise<Diagnostics> => {
  const data: Diagnostics = {
    created: new Date().toISOString(),
    platform: await getPlatform(),
    client: {
      version: client.version,
      storage: STORAGE_VERSION,
    },

    // TODO(burdon): Are these the same?
    // config: await client.services.services.SystemService?.getConfig(),
    config: client.config.values,
  };

  const identity = client.halo.identity.get();
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
    }
  }

  return jsonStringify(data, options) as Diagnostics;
};

const getSpaceStats = async (client: Client, info: SubscribeToSpacesResponse.SpaceInfo): Promise<SpaceStats> => {
  const identity = client.halo.identity.get();
  const type = info.key.equals(identity!.spaceKey!) ? 'halo' : 'echo';
  const stats: SpaceStats = { type, info };

  // TODO(burdon): Process HALO pipeline also.
  if (type === 'echo' && info.isOpen) {
    const space = client.getSpace(info.key);
    invariant(space);
    await space.waitUntilReady();
    const { objects } = space.db.query();

    Object.assign(stats, {
      properties: {
        name: space.properties.name,
      },
      metrics: space.internal.data.metrics,
      db: {
        objects: objects.length,
      },
      epochs: await getEpochs(client.services!.services.SpacesService!, space),
      members: space?.members.get(),
      feeds: {
        control: space.internal.data.pipeline?.controlFeeds,
        data: space.internal.data.pipeline?.dataFeeds,
      },
    } as SpaceStats);

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
  await space.waitUntilReady();

  const done = new Trigger();
  // TODO(burdon): Other stats from internal.data.
  const currentEpoch = space.internal.data.pipeline!.currentEpoch!;
  if (!currentEpoch) {
    log.warn('Invalid current epoch.');
    setTimeout(() => done.wake(), 1000);
  }

  // TODO(burdon): Hangs.
  const stream = service.queryCredentials({ spaceKey: space.key });
  stream.subscribe(async (credential) => {
    switch (credential.subject.assertion['@type']) {
      case 'dxos.halo.credentials.Epoch': {
        // TODO(burdon): Epoch number is not monotonic.
        const { number, timeframe } = credential.subject.assertion;
        epochs.push({ number, timeframe });
        if (currentEpoch.id && credential.id?.equals(currentEpoch.id)) {
          done.wake();
        }
        break;
      }
    }
  });

  await done.wait();
  stream.close();
  return epochs;
};

const getPlatform = async (): Promise<Platform> => {
  if (typeof window !== 'undefined') {
    const { userAgent } = window.navigator;
    return {
      type: 'browser',
      platform: userAgent,
    };
  }

  // https://nodejs.org/api/os.html
  try {
    const { machine, platform, release } = await require('node:os');
    return {
      type: 'node',
      platform: `${platform()} ${release()} ${machine()}`,
      runtime: process.version,
    };
  } catch (err) {
    // TODO(burdon): Fails in CI; ERROR: Could not resolve "node:os"
    return {
      type: 'node',
      platform: '',
    };
  }
};
