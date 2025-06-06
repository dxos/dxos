//
// Copyright 2023 DXOS.org
//

import { Plugin } from '../plugin';

/**
 * Implements knowledge pipeline.
 */
export class AutomationPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/chain';

  // TODO(burdon): Expose chain/model service API to functions.
  override async onOpen(): Promise<void> {}
}
