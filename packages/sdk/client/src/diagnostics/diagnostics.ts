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
import { Device, Identity, SpaceMember, SpacesService } from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToSpacesResponse, SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { Timeframe } from '@dxos/timeframe';
import { humanize } from '@dxos/util';

import { Client } from '../client';

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
};

export type ClientStats = {
  identity: Identity;
  devices: Device[];
  spaces: SpaceStats[];
  feeds: SubscribeToFeedsResponse.Feed[];
  config: ConfigProto;
  storageVersion: number;
};

export type DiagnosticOptions = {
  truncate?: boolean;
  humanize?: boolean;
};

// TODO(burdon): Move method to Monitor class.
export const diagnostics = async (client: Client, options: DiagnosticOptions): Promise<Partial<ClientStats>> => {
  const host = client.services.services.DevtoolsHost!;
  const data: Partial<ClientStats> = {};

  const identity = client.halo.identity.get();
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
            const type = info.key.equals(identity.spaceKey!) ? 'halo' : 'echo';
            const stats: SpaceStats = { type, info };
            if (type === 'echo') {
              const space = client.getSpace(info.key);
              invariant(space);
              await space.waitUntilReady();
              const result = space?.db.query();
              Object.assign(stats, {
                epochs: await getEpochs(client.services!.services.SpacesService!, space),
                members: space?.members.get(),
                properties: {
                  name: space?.properties.name,
                },
                db: {
                  items: result?.objects.length,
                },
              });
            }

            return stats;
          }),
        );

        trigger.wake();
      });

      await trigger.wait();
    }
  }

  // Feeds.
  // TODO(burdon): Map feeds to spaces?
  {
    const trigger = new Trigger();
    const stream = host.subscribeToFeeds({});
    stream?.subscribe((msg) => {
      data.feeds = msg.feeds;
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

  // Config.
  data.config = await client.services.services.SystemService?.getConfig();

  // Storage version.
  data.storageVersion = STORAGE_VERSION;

  return data;
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
