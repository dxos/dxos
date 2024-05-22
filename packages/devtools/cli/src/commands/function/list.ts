//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Config } from '@dxos/config';
import { type FunctionDef, type FunctionManifest } from '@dxos/functions';

import { BaseCommand } from '../../base-command';

// TODO(burdon): List stats.
export const printFunctions = (functions: FunctionDef[], flags = {}) => {
  ux.table(
    // TODO(burdon): Cast util.
    functions as Record<string, any>[],
    {
      uri: {
        header: 'uri',
      },
      path: {
        header: 'path',
      },
      handler: {
        header: 'handler',
      },
      description: {
        header: 'description',
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
    return await this.execWithClient(async (client) => {
      // TODO(dmaretskyi): Move into system service?
      const config = new Config(JSON.parse((await client.services.services.DevtoolsHost!.getConfig()).config));
      const functionsConfig = config.values.runtime?.agent?.plugins?.find(
        (plugin) => plugin.id === 'dxos.org/agent/plugin/functions', // TODO(burdon): Use const.
      );

      // TODO(burdon): ???
      const file = this.flags.manifest ?? functionsConfig?.config?.manifest ?? join(process.cwd(), 'functions.yml');
      const manifest = load(await readFile(file, 'utf8')) as FunctionManifest;
      // const { functions } = manifest;
      // printFunctions(functions);
      return manifest;
    });
  }
}
