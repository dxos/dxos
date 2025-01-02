//
// Copyright 2024 DXOS.org
//

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { type DEFAULT_OUTPUT } from '../../../shapes';
import { createOutputSchema } from '../../shapes/defs';
import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * User input
 */
export class Text extends ComputeNode<void, { [DEFAULT_OUTPUT]: string }> {
  override readonly type = 'text';

  constructor() {
    // TODO(burdon): Standardize.
    super(S.Void, createOutputSchema(S.String));
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
