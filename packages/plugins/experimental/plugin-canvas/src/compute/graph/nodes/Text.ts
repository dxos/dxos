//
// Copyright 2024 DXOS.org
//

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * User input
 */
export class Text extends ComputeNode<void, string> {
  override readonly type = 'text';

  constructor() {
    super(S.Void, S.String);
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
