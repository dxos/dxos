//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import React from 'react';

import { BaseCommand } from '../../base';

// TODO(burdon): Experimental (make JIT to remove react dependency).
//  https://oclif.io/docs/jit_plugins
export default class Status extends BaseCommand<typeof Status> {
  static override enableJsonFlag = true;
  static override description = 'Display status.';
  static override flags = {
    ...BaseCommand.flags,
    interval: Flags.integer({
      description: 'Update interval (ms).',
      default: 1000,
    }),
  };

  async run(): Promise<any> {
    // Avoid importing ink modules at top-level to prevent top level await issues during manifest generation.
    const { render } = await import('ink');
    const { App } = await import('../../components/App');
    return await this.execWithClient(async ({ client }) => {
      const element = React.createElement(App, { client, interval: this.flags.interval });
      const { waitUntilExit } = render(element);
      await waitUntilExit();
    });
  }
}
