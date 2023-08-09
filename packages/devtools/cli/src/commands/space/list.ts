//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { Space } from '@dxos/client-protocol';
import { Context } from '@dxos/context';

import { BaseCommand } from '../../base-command';
import { mapSpaces, printSpaces } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List spaces.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
    live: Flags.boolean({
      description: 'Live update.',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const spaces = await this.getSpaces(client);
      if (this.flags.json) {
        return mapSpaces(spaces);
      } else {
        printSpaces(spaces, this.flags);

        if (this.flags.live) {
          // TODO(burdon): Use https://www.npmjs.com/package/ansi-escapes to reset screen.
          console.clear();
          await this._startLiveUpdate(client);
          await new Promise((resolve, reject) => {});
        }
      }
    });
  }

  async _startLiveUpdate(client: Client) {
    const ctx = new Context();
    const subscriptions = new Map<string, { unsubscribe: () => void }>();
    ctx.onDispose(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));

    const update = new Event().debounce(1000);
    update.on(ctx, async () => {
      console.clear();
      printSpaces(spaces, this.flags);
    });

    const subscribeToSpaceUpdate = (space: Space) =>
      space.pipeline.subscribe({
        next: () => {
          update.emit();
        },
      });

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
