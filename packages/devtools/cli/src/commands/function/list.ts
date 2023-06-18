//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { FaasClient } from '@dxos/agent';

import { BaseCommand } from '../../base-command';

export const printFunctions = (functions: any[], flags = {}) => {
  ux.table(
    functions,
    {
      name: {
        header: 'name',
      },
    },
    {
      ...flags,
    },
  );
};

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List functions.';

  async run(): Promise<any> {
    const client = new FaasClient(this.clientConfig.values.runtime?.services?.faasd ?? {});
    const result: any[] = await client.listFunctions();
    printFunctions(result);
    return result;
  }
}
