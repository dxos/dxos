//
// Copyright 2024 DXOS.org
//

import { computed, type Signal } from '@preact/signals-core';

import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';

/**
 * List accumulator.
 */
export class List<T extends object> extends ComputeNode<T, T[]> {
  override readonly type = 'list';

  _list: T[] = [];

  constructor(schema: S.Schema<T>) {
    super(schema, S.mutable(S.Array(schema)));
  }

  get length(): Signal<number> {
    return computed(() => this._list.length);
  }

  override async invoke(input: T) {
    this._list.push(input);
    return this._list;
  }
}
