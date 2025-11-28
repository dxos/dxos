//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';

import { FLAG_SPACE_KEYS, type TableOptions, stringify, table } from '@dxos/cli-base';
import { Filter, Obj } from '@dxos/echo';
import { omit } from '@dxos/log';
import { Message } from '@dxos/types';

import { BaseCommand } from '../../base.js';

// TODO(burdon): Option no-wrap.
export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';
  static override flags = {
    ...BaseCommand.flags,
    ...FLAG_SPACE_KEYS,
    type: Flags.string({ description: 'Data type.' }),
    extended: Flags.boolean(),
  };

  async run(): Promise<any> {
    return await this.execWithSpace(
      async ({ space }) => {
        let filter: Filter.Any | undefined;
        let printer: ObjectPrinter<any> | undefined;
        switch (this.flags.type) {
          case Message.Message.typename: {
            filter = Filter.type(Message.Message);
            printer = (data: Message.Message) => {
              return stringify({ from: data.sender.email, content: data.blocks.length });
            };
            break;
          }

          default:
            break;
        }

        const objects = await space.db.query(filter ?? Filter.everything()).run();
        if (!this.flags.json) {
          printObjects(objects, { printer, extended: this.flags.extended });
        }

        return { objects };
      },
      { spaceKeys: this.flags.key },
    );
  }
}

type ObjectPrinter<T = {}> = (data: T) => string;

const defaultPrinter: ObjectPrinter = (data) => stringify(omit(data, '@type'));

type PrintOptions = TableOptions & {
  printer?: ObjectPrinter;
};

const printObjects = (objects: any[], { printer = defaultPrinter, ...flags }: PrintOptions = {}) => {
  ux.stdout(
    table(
      objects,
      {
        id: {
          truncate: true,
        },
        type: {
          get: (row) => chalk.blue(Obj.getTypename(row)),
        },
        meta: {
          get: (row) => {
            const keys = Obj.getMeta(row).keys;
            if (keys?.length) {
              return '[' + keys.map(({ source, id }) => `${chalk.green(source)}:${chalk.gray(id)}`).join(', ') + ']';
            } else {
              return '';
            }
          },
        },
        data: {
          extended: true,
          get: (row) => printer(row),
        },
      },
      flags,
    ),
  );
};
