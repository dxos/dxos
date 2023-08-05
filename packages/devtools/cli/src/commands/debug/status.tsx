//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import { render } from 'ink';
import React from 'react';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { App } from '../../components/App';

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
    return await this.execWithClient(async (client: Client) => {
      const { waitUntilExit } = render(<App client={client} interval={this.flags.interval} />);
      await waitUntilExit();
    });
  }
}
