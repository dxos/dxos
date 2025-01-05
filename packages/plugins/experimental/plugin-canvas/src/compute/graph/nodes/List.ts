//
// Copyright 2024 DXOS.org
//

import { signal, type Signal } from '@preact/signals-core';

import { S } from '@dxos/echo-schema';

import { createInputSchema, createOutputSchema, type InputType, type OutputType } from '../../shapes/defs';
import { ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT } from '../compute-node';

/**
 * List accumulator.
 */
// TODO(burdon): Adapt to support transform from I to O[] type.
export class List<T = any> extends ComputeNode<{ [DEFAULT_INPUT]: T }, { [DEFAULT_OUTPUT]: T[] }> {
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

  override async invoke({ [DEFAULT_INPUT]: value }: { [DEFAULT_INPUT]: T }) {
    // TODO(burdon): Hack since GPT sends an array (user prompt then response). Needs configuration.
    if (Array.isArray(value)) {
      this._items.value = [...this._items.value, ...value];
    } else {
      this._items.value = [...this._items.value, value];
    }

    return {
      [DEFAULT_OUTPUT]: this._items.value,
    };
  }
}
