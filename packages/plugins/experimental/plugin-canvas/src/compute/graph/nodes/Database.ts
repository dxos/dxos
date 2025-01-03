//
// Copyright 2024 DXOS.org
//

import { LLMTool } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * Database GPT tool.
 */
export class Database extends ComputeNode<void, LLMTool> {
  override readonly type = 'database';

  constructor() {
    super(S.Void, LLMTool);
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
