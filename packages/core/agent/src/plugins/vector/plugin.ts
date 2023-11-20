//
// Copyright 2023 DXOS.org
//

import { Plugin } from '../plugin';

/**
 * Constructs vector database from ECHO documents.
 */
// TODO(burdon): Provide resources to other plugins, functions, etc.
export class VectorPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/vector';

  override async onOpen() {}
}
