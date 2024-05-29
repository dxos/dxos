//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';

import { Filter } from '@dxos/client/echo';
import { FunctionTrigger } from '@dxos/functions';
import { omit } from '@dxos/log';

import { BaseCommand } from '../../base';
import { stringify } from '../../util';

export default class Trigger extends BaseCommand<typeof Trigger> {
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
        const { objects: triggers } = await space.db.query(Filter.schema(FunctionTrigger)).run();
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
      { verbose: this.flags.verbose, types: [FunctionTrigger] },
    );
  }
}

// TODO(burdon): List stats.
// TODO(burdon): Standardize ids, etc.
export const printTriggers = (functions: FunctionTrigger[], flags: ux.Table.table.Options = {}) => {
  ux.table(
    // TODO(burdon): Cast util.
    functions as Record<string, any>[],
    {
      id: {
        header: 'id',
        get: (row) => row.id.slice(0, 8),
      },
      enabled: {
        header: 'enabled',
        get: (row) => (row.enabled ? `${chalk.green('✔')}` : ''),
      },
      function: {
        header: 'function',
        get: (row) => `${chalk.blue(row.function)}`,
      },
      type: {
        header: 'type',
        get: (row) => row.spec.type,
      },
      meta: {
        header: 'spec',
        get: (row) => stringify(omit(row.spec, 'type')),
      },
    },
    flags,
  );
};
