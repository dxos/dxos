//
// Copyright 2024 DXOS.org
//

import { signal, type Signal } from '@preact/signals-core';

import { S } from '@dxos/echo-schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../../../shapes';
import { createInputSchema, createOutputSchema, type InputType, type OutputType } from '../../shapes/defs';
import { ComputeNode } from '../compute-node';

/**
 * List accumulator.
 */
// TODO(burdon): Adapt to support transform from I to O[] type.
export class List<INPUT extends InputType<T>, OUTPUT extends OutputType<T[]>, T = any> extends ComputeNode<
  INPUT,
  OUTPUT
> {
  override readonly type = 'list';

  private readonly _items: Signal<T[]> = signal([]);

  constructor(schema: S.Schema<T>) {
    super(createInputSchema(schema), createOutputSchema(S.mutable(S.Array(schema))));
  }

  get items(): Signal<T[]> {
    return this._items;
  }

  clear() {
    this._items.value.length = 0;
  }

  override async invoke(input: INPUT) {
    const value = input[DEFAULT_INPUT];
    this._items.value = [...this._items.value, value];

    return {
      [DEFAULT_OUTPUT]: this._items.value,
    } as OUTPUT;
  }
}
