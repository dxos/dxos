//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { Event } from '@dxos/async';
import { mapSpaces, printSpaces, TABLE_FLAGS } from '@dxos/cli-base';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { Filter } from '@dxos/echo';

import { BaseCommand } from '../../base';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List spaces.';
  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
    live: Flags.boolean({
      description: 'Live update.',
    }),
    // TODO(dmaretskyi): Inverted flags?
    noWait: Flags.boolean({
      description: 'Do not wait for spaces to be ready.',
    }),
    timeout: Flags.integer({
      description: 'Timeout (ms).',
      default: 1_000,
      aliases: ['t'],
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      const spaces = await this.getSpaces(client, { wait: !this.flags.noWait });
      if (this.flags.json) {
        return mapSpaces(spaces);
      } else {
        await printSpaces(spaces, this.flags as any);

        if (this.flags.live) {
          // TODO(burdon): Use https://www.npmjs.com/package/ansi-escapes to reset screen.
          console.clear();
          await this._startLiveUpdate(client);
          await new Promise((resolve, reject) => {});
        }
      }
    });
  }

  async _startLiveUpdate(client: Client): Promise<void> {
    const ctx = new Context();
    const subscriptions = new Map<string, { unsubscribe: () => void }>();
    ctx.onDispose(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));

    const update = new Event();
    update.debounce(1000).on(ctx, async () => {
      console.clear();
      await printSpaces(spaces, this.flags as any);
    });

    const subscribeToSpaceUpdate = (space: Space) => {
      const sub1 = space.pipeline.subscribe({
        next: () => {
          update.emit();
        },
      });
      const sub2 = space.db.query(Filter.everything()).subscribe(() => {
        update.emit();
      });
      return {
        unsubscribe: () => {
          sub1.unsubscribe();
          sub2();
        },
      };
    };

    // Monitor space updates.
    let spaces = await this.getSpaces(client);
    spaces.forEach((space) => {
      subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
    });

    // Monitor new spaces.
    subscriptions.set(
      'client',
      client.spaces.subscribe({
        next: async () => {
          spaces = await this.getSpaces(client);
          // Monitor space updates for new spaces.
          spaces
            .filter((space) => !subscriptions.has(space.key.toHex()))
            .forEach((space) => {
              subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
            });
        },
      }),
    );
  }
}
