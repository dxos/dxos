//
// Copyright 2025 DXOS.org
//

import { computed, type Signal } from '@preact/signals-core';

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_INPUT, NoOutput } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * Beacon displays the current boolean status.
 */
export class Beacon extends ComputeNode<{ [DEFAULT_INPUT]: boolean }, NoOutput> {
  override readonly type = 'beacon';

  constructor() {
    super(S.Struct({ [DEFAULT_INPUT]: S.Boolean }), NoOutput);
  }

  get state(): Signal<boolean> {
    return computed(() => !!this._input.value);
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
