//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

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
    return await this.execWithDaemon(async (daemon) => {
      const result: any[] = [];
      printFunctions(result);
      return result;
    });
  }
}
