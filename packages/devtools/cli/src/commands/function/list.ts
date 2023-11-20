//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import { format, parseISO } from 'date-fns';

import { FaasClient } from '@dxos/agent';

import { BaseCommand } from '../../base-command';

export const printFunctions = (functions: any[], flags = {}) => {
  ux.table(
    functions,
    {
      name: {
        header: 'name',
      },
      image: {
        header: 'image',
      },
      createdAt: {
        header: 'createdAt',
        get: (row) => format(parseISO(row.createdAt), 'MM/dd/yyyy HH:mm'),
      },
      invocationCount: {
        header: 'invocations',
      },
    },
    {
      ...flags,
    },
  );
};

/**
 * @deprecated
 */
export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List functions.';
  // static override state = 'deprecated';

  async run(): Promise<any> {
    const client = new FaasClient(this.clientConfig.values.runtime?.services?.faasd ?? {});
    const result: any[] = await client.listFunctions();
    printFunctions(result);
    return result;
  }
}
