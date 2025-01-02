//
// Copyright 2025 DXOS.org
//

import { computed, type Signal } from '@preact/signals-core';

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * Beacon displays the current boolean status.
 */
export class Beacon extends ComputeNode<boolean, void> {
  override readonly type = 'beacon';

  constructor() {
    super(S.Boolean, S.Void);
  }

  get state(): Signal<boolean> {
    return computed(() => !!this._input.value);
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
