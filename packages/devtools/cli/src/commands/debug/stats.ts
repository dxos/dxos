//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { Trigger } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { Device, Identity, SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToSpacesResponse, SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { humanize } from '@dxos/util';

import { BaseCommand } from '../../base-command';

type SpaceStats = {
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

type ClientStats = {
  identity: Identity;
  devices: Device[];
  spaces: SpaceStats[];
  feeds: SubscribeToFeedsResponse.Feed[];
};

/**
 * DX_PROFILE=test dx-dev debug stats --json
 */
export default class Stats extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Output debug stats.';
  static override flags = {
    ...BaseCommand.flags,
    humanize: Flags.boolean({
      description: 'Humanized keys.',
    }),
    truncate: Flags.boolean({
      description: 'Truncate keys.',
    }),
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Stats);

    return await this.execWithClient(async (client: Client) => {
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
              const type = info.key.equals(identity.spaceKey) ? 'halo' : 'echo';
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
      if (flags.humanize || flags.truncate) {
        return JSON.parse(
          JSON.stringify(data, (key, value) => {
            if (typeof value === 'string') {
              const key = PublicKey.fromHex(value);
              if (key.toHex() === value) {
                return flags.humanize ? humanize(key) : key.truncate();
              }
            }

            return value;
          }),
        );
      }

      return data;
    });
  }
}
