//
// Copyright 2024 DXOS.org
//

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, NoInput } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * User input
 */
export class Text extends ComputeNode<NoInput, { [DEFAULT_OUTPUT]: string }> {
  override readonly type = 'text';

  constructor() {
    // TODO(burdon): Standardize.
    super(NoInput, S.Struct({ [DEFAULT_OUTPUT]: S.String }));
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
