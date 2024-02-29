//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Config } from '@dxos/config';
import type { FunctionManifest } from '@dxos/functions';

import { BaseCommand } from '../../base-command';

/**
 * @deprecated
 */
export default class Exec extends BaseCommand<typeof Exec> {
  static override enableJsonFlag = true;
  static override description = 'Invoke function.';

  static override args = {
    name: Args.string({ required: true, description: 'Function name.' }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client) => {
      // TODO(dmaretskyi): Move into system service?
      const config = new Config(JSON.parse((await client.services.services.DevtoolsHost!.getConfig()).config));
      const functionsConfig = config.values.runtime?.agent?.plugins?.find(
        (plugin) => plugin.id === 'dxos.org/agent/plugin/functions', // TODO(burdon): Use const.
      );

      const file = this.flags.manifest ?? functionsConfig?.config?.manifest ?? join(process.cwd(), 'functions.yml');
      const { functions } = load(await readFile(file, 'utf8')) as FunctionManifest;
      const fn = functions.find((fn) => fn.id === this.args.name);
      if (!fn) {
        this.warn(`Function not found: ${this.args.name}`);
        return null;
      }

      const { handler } = fn;

      // TODO(burdon): Get endpoint.
      const url = `http:/localhost:7100/dev/${handler}`;
      this.log(`Calling: ${url}`);
      const { status, statusText } = await fetch(url, {
        method: 'POST',
      });

      if (status !== 200) {
        this.warn(`Error(${status}): ${statusText}`);
      }
    });
  }
}
