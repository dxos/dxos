//
// Copyright 2022 DXOS.org
//

import { sleep, Trigger } from '@dxos/async';
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
  properties: {
    name: string;
  };
  stats: {
    items: number;
  };
  members: SpaceMember[];
  epochs: { number: number; timeframe: Timeframe }[];
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
            const space = client.getSpace(info.key);
            const result = space?.db.query();
            let epochs: SpaceStats['epochs'] = [];
            if (space) {
              epochs = await getEpochs(client.services!.services.SpacesService!, space);
            }

            return {
              type,
              info,
              epochs,
              stats: {
                items: result?.objects.length,
              },
              members: space?.members.get(),
              properties: {
                name: space?.properties.name,
              },
            } as SpaceStats;
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

// TODO(burdon): Keep in sync with agents.
const getEpochs = async (service: SpacesService, space: Space): Promise<SpaceStats['epochs']> => {
  const epochs: SpaceStats['epochs'] = [];
  const stream = service.queryCredentials({ spaceKey: space.key });
  stream.subscribe(async (credential) => {
    switch (credential.subject.assertion['@type']) {
      case 'dxos.halo.credentials.Epoch': {
        const { number, timeframe } = credential.subject.assertion;
        if (number > 0) {
          epochs.push({ number, timeframe });
        }
        break;
      }
    }
  });

  // TODO(burdon): Hack to wait for stream to complete.
  await sleep(1_000);
  stream.close();
  return epochs;
};
