//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { table } from '@dxos/cli-base';
import { Config } from '@dxos/config';
import { type FunctionManifest } from '@dxos/functions';

import { BaseCommand } from '../../base';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List functions.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client) => {
      // TODO(dmaretskyi): Move into system service?
      const host = await client.services.services.DevtoolsHost!;
      const config = new Config(JSON.parse((await host.getConfig()).config));
      const functionsConfig = config.values.runtime?.agent?.plugins?.find(
        (plugin) => plugin.id === 'dxos.org/agent/plugin/functions', // TODO(burdon): Use const.
      );

      const file = this.flags.manifest ?? functionsConfig?.config?.manifest ?? join(process.cwd(), 'functions.yml');
      const manifest = load(await readFile(file, 'utf8')) as FunctionManifest;
      const { functions } = manifest;
      printFunctions(functions);
      return manifest;
    });
  }
}

// TODO(burdon): List stats.
export const printFunctions = (functions: FunctionManifest['functions'] = []) => {
  ux.stdout(
    table(functions, {
      uri: { primary: true },
      route: {},
      handler: {},
      description: {},
    }),
  );
};
