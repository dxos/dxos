//
// Copyright 2024 DXOS.org
//

import { signal, type Signal } from '@preact/signals-core';

import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';

/**
 * Displays the current count.
 */
export class Counter extends ComputeNode<number, number> {
  override readonly type = 'counter';

  private readonly _count: Signal<number> = signal(0);

  constructor() {
    super(S.Number, S.Number);
  }

  get state(): Signal<number> {
    return this._count;
  }

  override async invoke(input: number) {
    // TODO(burdon): Value coercion.
    const inc = typeof (input as any) === 'number' ? input : 1;
    this._count.value = this._count.value + inc;
    return this._count.value;
  }
}
