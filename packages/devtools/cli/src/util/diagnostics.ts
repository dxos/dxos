//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { Device, Identity, SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToSpacesResponse, SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { humanize } from '@dxos/util';

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

// TODO(burdon): Factor out to Client.
export const diagnostics = async (client: Client, options: DiagnosticOptions) => {
  const host = client.services.services.DevtoolsHost!;
  const data: Partial<ClientStats> = {};

  const identity = client.halo.identity.get();
  if (identity) {
    data.identity = identity;
    data.devices = client.halo.devices.get();

    // Spaces.
    // TODO(burdon): Epochs.
    {
      const trigger = new Trigger();
      const stream = host.subscribeToSpaces({});
      stream?.subscribe(async (msg) => {
        data.spaces = msg.spaces!.map((info) => {
          const type = info.key.equals(identity.spaceKey!) ? 'halo' : 'echo';
          const space = client.getSpace(info.key);
          const result = space?.db.query();

          return {
            type,
            info,
            properties: {
              name: space?.properties.name,
            },
            stats: {
              items: result?.objects.length,
            },
            members: space?.members.get(),
          } as SpaceStats;
        });

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
