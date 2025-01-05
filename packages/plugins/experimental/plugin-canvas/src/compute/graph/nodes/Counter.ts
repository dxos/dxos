//
// Copyright 2024 DXOS.org
//

import { signal, type Signal } from '@preact/signals-core';

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT } from '../compute-node';

/**
 * Displays the current count.
 */
export class Counter extends ComputeNode<{ [DEFAULT_INPUT]: number }, { [DEFAULT_OUTPUT]: number }> {
  override readonly type = 'counter';

  private readonly _count: Signal<number> = signal(0);

  constructor() {
    super(S.Struct({ [DEFAULT_INPUT]: S.Number }), S.Struct({ [DEFAULT_OUTPUT]: S.Number }));
  }

  get state(): Signal<number> {
    return this._count;
  }

  override async invoke({ [DEFAULT_INPUT]: input }: { [DEFAULT_INPUT]: number }) {
    // TODO(burdon): Value coercion.
    const inc = typeof (input as any) === 'number' ? input : 1;
    this._count.value = this._count.value + inc;
    return { [DEFAULT_OUTPUT]: this._count.value };
  }
}
