//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { Space } from '@dxos/client-protocol';
import { PublicKey } from '@dxos/keys';
import { Device, Identity, SpaceMember, SpacesService } from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToSpacesResponse, SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { Timeframe } from '@dxos/timeframe';
import { humanize } from '@dxos/util';

import { Client } from './client';

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
};

export type DiagnosticOptions = {
  truncate?: boolean;
  humanize?: boolean;
};

export const diagnostics = async (client: Client, options: DiagnosticOptions) => {
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
            const stats: SpaceStats = {
              type,
              info,
            };

            if (type === 'echo') {
              const space = client.getSpace(info.key);
              assert(space);

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

  return data;
};

const getEpochs = async (service: SpacesService, space: Space): Promise<SpaceStats['epochs']> => {
  const done = new Trigger();
  // TODO(burdon): Other stats from internal.data.
  const currentEpoch = space.internal.data.pipeline!.currentEpoch!;

  // TODO(burdon): Hangs.
  const epochs: SpaceStats['epochs'] = [];
  const stream = service.queryCredentials({ spaceKey: space.key });
  stream.subscribe(async (credential) => {
    console.log('???');
    switch (credential.subject.assertion['@type']) {
      case 'dxos.halo.credentials.Epoch': {
        console.log('ep');
        // TODO(burdon): Epoch number is not monotonic.
        const { number, timeframe } = credential.subject.assertion;
        if (number > 0) {
          epochs.push({ number, timeframe });
          if (timeframe.equals(currentEpoch.subject.assertion.timeframe)) {
            done.wake();
          }
        }
        break;
      }
    }
  });

  await done.wait();
  stream.close();
  return epochs;
};
