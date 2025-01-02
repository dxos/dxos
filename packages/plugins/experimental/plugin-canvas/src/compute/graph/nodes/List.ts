//
// Copyright 2024 DXOS.org
//

import { computed, type Signal } from '@preact/signals-core';

import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';

/**
 * Displays the current count.
 */
export class Calculator extends ComputeNode<number, number> {
  override readonly type = 'calculator';

  _current = 0;

  constructor() {
    super(S.Number, S.Number);
  }

  get state(): Signal<number> {
    return computed(() => this._current);
  }

  // TODO(burdon): Value coercion.
  override async invoke(input: number) {
    console.log('????', input, typeof input);
    this._current += input;
    return this._current;
  }
}
