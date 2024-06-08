//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';

import { MessageType } from '@braneframe/types';
import { FLAG_SPACE_KEYS } from '@dxos/cli-base';
import { stringify, table, type TableOptions } from '@dxos/cli-base';
import { Filter } from '@dxos/client/echo';
import { getMeta, getTypename } from '@dxos/echo-schema';
import { omit } from '@dxos/log';

import { BaseCommand } from '../../base';

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
        let filter: Filter | undefined;
        let printer: ObjectPrinter<any> | undefined;
        switch (this.flags.type) {
          case MessageType.typename: {
            filter = Filter.schema(MessageType);
            printer = (data: MessageType) => {
              return stringify({ from: data.from.email, content: data.blocks.length });
            };
            break;
          }

          default:
            break;
        }

        const { objects } = await space.db.query(filter).run();
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
          get: (row) => chalk.blue(getTypename(row)),
        },
        meta: {
          get: (row) => {
            const keys = getMeta(row).keys;
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
