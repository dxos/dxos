//
// Copyright 2024 DXOS.org
//

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * Switch outputs true when set.
 */
export class Switch extends ComputeNode<void, boolean> {
  override readonly type = 'switch';

  constructor() {
    super(S.Void, S.Boolean);
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
