//
// Copyright 2023 DXOS.org
//

import { Plugin } from '../plugin';

export class DiscordPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/discord';

  // TODO(burdon): Spawn Discord bot via CLI.
  // TODO(burdon): Set-up INTERACTIONS ENDPOINT URL to access post requests.
  override async onOpen(): Promise<void> {}
  override async onClose(): Promise<void> {}
}
