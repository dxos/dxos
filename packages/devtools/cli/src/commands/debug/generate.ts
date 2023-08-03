//
// Copyright 2023 DXOS.org
//

import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';

// TODO(burdon): Testing plugin (vs. debug)?
export default class Generate extends BaseCommand<typeof Generate> {
  static override enableJsonFlag = true;
  static override description = 'Generate test data.';

  // TODO(burdon): Uniformly provide as arg/flag?
  static override args = { key: Args.string({ description: 'Space key head in hex.', required: true }) };
  static override flags = {
    ...BaseCommand.flags,
    objects: Flags.integer({
      description: 'Number of objects.',
    }),
    mutations: Flags.integer({
      description: 'Number of mutations.',
    }),
  };

  // TODO(burdon): Generate N mutations (see debug plugin).
  async run(): Promise<any> {
    console.log('generate', this.args.key);
  }
}
