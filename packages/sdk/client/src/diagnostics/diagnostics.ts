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
import { humanize } from '@dxos/util';

import { Client } from '../client';

export type Diagnostics = {
  created: string;
  client: {
    version: string;
    storageVersion: number;
  };
  config: ConfigProto;
  platform: Platform;
  identity: Identity;
  devices: Device[];
  spaces: SpaceStats[];
  feeds: Partial<SubscribeToFeedsResponse.Feed>[];
};

export type SpaceStats = {
  type: 'echo' | 'halo';
  info: SubscribeToSpacesResponse.SpaceInfo;
  properties?: {
    name: string;
  };
  db?: {
    items: number;
  };
  members?: SpaceMember[];
  epochs?: { number: number; timeframe: Timeframe }[];
  metrics?: SpaceProto.Metrics & {
    startupTime?: number;
  };
};

export type Platform = {
  type: 'browser' | 'node';
  platform: string;
  runtime?: string;
};

export type DiagnosticOptions = {
  truncate?: boolean;
  humanize?: boolean;
};

// TODO(burdon): Factor out (move into Monitor class).
export const createDiagnostics = async (client: Client, options: DiagnosticOptions): Promise<Diagnostics> => {
  const host = client.services.services.DevtoolsHost!;
  const data: Partial<Diagnostics> = {
    created: new Date().toISOString(),
    platform: await getPlatform(),
    client: {
      version: client.version,
      storageVersion: STORAGE_VERSION,
    },
    // TODO(burdon): Are these the same?
    config: client.config.values,
    // config: await client.services.services.SystemService?.getConfig(),
  };

  const identity = client.halo.identity.get();
  log('diagnostics', { identity });
  if (identity) {
    data.identity = identity;
    data.devices = client.halo.devices.get();

    // Spaces.
    {
      const trigger = new Trigger();
      const stream = host.subscribeToSpaces({});
      stream?.subscribe(async (msg) => {
        data.spaces = await Promise.all(
          msg.spaces!.map(async (info) => {
            log('processing...', info);
            const type = info.key.equals(identity.spaceKey!) ? 'halo' : 'echo';
            const stats: SpaceStats = { type, info };
            if (type === 'echo' && info.isOpen) {
              const space = client.getSpace(info.key);
              invariant(space);
              await space.waitUntilReady();
              const result = space?.db.query();
              Object.assign(stats, {
                metrics: space.internal.data.metrics,
                epochs: await getEpochs(client.services!.services.SpacesService!, space),
                members: space?.members.get(),
                properties: {
                  name: space?.properties.name,
                },
                db: {
                  items: result?.objects.length,
                },
              });

              // TODO(burdon): Factor out.
              if (stats.metrics) {
                const { open, ready } = stats.metrics ?? {};
                stats.metrics.startupTime = open && ready && ready.getTime() - open.getTime();
              }
            }

            return stats;
          }),
        );

        trigger.wake();
      });

      log('waiting...');
      await trigger.wait();
    }
  }

  // Feeds.
  // TODO(burdon): Map feeds to spaces?
  if (identity) {
    const trigger = new Trigger();
    const stream = host.subscribeToFeeds({});
    stream?.subscribe((msg) => {
      data.feeds = msg.feeds?.map(({ feedKey, bytes, length }) => ({
        feedKey,
        bytes,
        length,
      }));

      trigger.wake();
    });

    await trigger.wait();
  }

  // Transform keys.
  if (options.humanize || options.truncate) {
    return JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (typeof value === 'string') {
          const key = PublicKey.fromHex(value);
          if (key.toHex() === value) {
            return options.humanize ? humanize(key) : key.truncate();
          }
        }

        return value;
      }),
    );
  }

  return data as Diagnostics;
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
