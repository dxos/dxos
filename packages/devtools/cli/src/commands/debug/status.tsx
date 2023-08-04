//
// Copyright 2023 DXOS.org
//

import { render } from 'ink';
import React from 'react';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { SpaceTable } from '../../components';

export default class Status extends BaseCommand<typeof Status> {
  static override enableJsonFlag = true;
  static override description = 'Display status.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const { waitUntilExit } = render(<SpaceTable client={client} />);
      await waitUntilExit();
    });
  }
}
