//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';

import { MessageType } from '@braneframe/types';
import { Filter, getMeta } from '@dxos/client/echo';
import { getTypename } from '@dxos/echo-schema';
import { omit } from '@dxos/log';

import { ComposerBaseCommand } from './base';
import { BaseCommand, FLAG_SPACE_KEYS } from '../../base';

export default class Query extends ComposerBaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';
  static override flags = {
    ...BaseCommand.flags,
    ...FLAG_SPACE_KEYS,
    type: Flags.string({ description: 'Data type.' }),
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
              // TODO(burdon): Print messages.
              return JSON.stringify({ from: data.from.email, content: data.blocks.length });
            };
            break;
          }

          default:
            break;
        }

        const { objects } = await space.db.query(filter).run();
        if (!this.flags.json) {
          printObjects(objects, printer);
        }

        return { objects };
      },
      { spaceKeys: this.flags.key },
    );
  }
}

type ObjectPrinter<T = {}> = (data: T) => string;

const printObjects = (objects: any[], printer: ObjectPrinter = (data) => JSON.stringify(omit(data, '@type'))) => {
  ux.table(objects, {
    id: {
      header: 'id',
      get: (row) => row.id.slice(0, 8),
    },
    type: {
      header: 'type',
      get: (row) => getTypename(row),
    },
    meta: {
      header: 'meta',
      get: (row) =>
        getMeta(row)
          .keys?.map(({ source, id }) => `${source}:${id}`)
          .join(','),
    },
    data: {
      header: 'data',
      get: (row) => printer(row),
    },
  });
};
