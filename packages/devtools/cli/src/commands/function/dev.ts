//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Config } from '@dxos/config';

import { InvokeOptions, mountTrigger, runFunctions } from '@dxos/functions';

import { BaseCommand } from '../../base-command';
import { FunctionsManifest } from '@dxos/functions/src/defintions';
import { Context } from '@dxos/context';
import assert from 'node:assert';

export default class Dev extends BaseCommand<typeof Dev> {
  static override enableJsonFlag = true;
  static override description = 'Functions dev server.';

  static override flags = {
    ...BaseCommand.flags,
    require: Flags.string({ multiple: true, aliases: ['r'] }),
    manifest: Flags.string({ default: 'functions.yml' }),
  };

  async run(): Promise<any> {
    for (const requirePath of this.flags.require ?? []) {
      require(requirePath);
    }

    const functionsManifest = load(await readFile(join(process.cwd(), this.flags.manifest), 'utf8')) as FunctionsManifest;

    await this.execWithClient(async (client) => {
      // 😨 There must be a better way...
      // TODO(dmaretskyi): Move into system service?
      const config = new Config(JSON.parse((await client.services.services.DevtoolsHost!.getConfig()).config))
      assert(config.values.runtime?.agent?.functions?.port, 'functions port not set');

      await runFunctions({
        client,
        functionsDirectory: join(process.cwd(), 'src/functions'),
        manifest: functionsManifest,
      });

      const invokeOptions: InvokeOptions = {
        runtime: 'dev',
        endpoint: `http://localhost:${config.values.runtime?.agent?.functions?.port}`,
      }
      for(const trigger of functionsManifest.triggers) {
        await mountTrigger({
          client,
          trigger,
          invokeOptions,
          ctx: new Context()
        });
      }

      // Hang forever.
      await new Promise(() => {});
    });
  }
}
