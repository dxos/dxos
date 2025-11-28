//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';

import { type TableOptions, table } from '@dxos/cli-base';
import { Filter } from '@dxos/client/echo';
import { Trigger } from '@dxos/functions';

import { BaseCommand } from '../../../base';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List and manage triggers.';
  static override flags = {
    ...BaseCommand.flags,
    id: Flags.string({ description: 'Trigger id' }),
    enable: Flags.boolean({ description: 'Enable trigger(s)' }),
    disable: Flags.boolean({ description: 'Disable trigger(s)' }),
    extended: Flags.boolean(),
  };

  async run(): Promise<any> {
    return await this.execWithSpace(
      async ({ space }) => {
        const triggers = await space.db.query(Filter.type(Trigger.Trigger)).run();
        const filtered = this.flags.id ? triggers.filter((filter) => filter.id.startsWith(this.flags.id!)) : triggers;
        if (this.flags.enable !== undefined || this.flags.disable !== undefined) {
          for (const trigger of filtered) {
            if (this.flags.enable) {
              trigger.enabled = true;
            } else if (this.flags.disable) {
              trigger.enabled = false;
            }
          }
        }
        await space.db.flush();
        if (!this.flags.json) {
          printTriggers(filtered, { extended: this.flags.extended });
        }
        return filtered;
      },
      { verbose: this.flags.verbose, types: [Trigger.Trigger] },
    );
  }
}

// TODO(burdon): List stats.
export const printTriggers = (triggers: Trigger.Trigger[], options: TableOptions) => {
  ux.stdout(
    table(
      triggers,
      {
        id: { primary: true, truncate: true },
        enabled: { get: (row) => (row.enabled ? `${chalk.green('✔')}` : '') },
        function: {},
        spec: { get: (row) => row.spec.kind },
      },
      options,
    ),
  );
};
