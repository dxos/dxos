//
// Copyright 2023 DXOS.org
//

import { Plugin } from '../plugin';

/**
 * Implements knowledge pipeline.
 */
export class ChainPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/chain';

  // TODO(burdon): Provide resources (e.g., vector database) to other plugins, functions, etc.
  override async onOpen() {}
}
