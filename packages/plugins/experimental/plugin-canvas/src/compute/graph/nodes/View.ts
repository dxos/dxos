//
// Copyright 2024 DXOS.org
//

import { effect, signal, type Signal } from '@preact/signals-core';

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT, NoOutput } from '../compute-node';
import { raise } from '@dxos/debug';
import { InvalidStateError } from '../state-machine';

/**
 * Displays the current value.
 */
export class View extends ComputeNode<{ [DEFAULT_INPUT]: any }, NoOutput> {
  override readonly type = 'view';

  constructor() {
    super(S.Struct({ [DEFAULT_INPUT]: S.Any }), NoOutput);
  }

  get state(): any {
    return this._input.value[DEFAULT_INPUT];
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }

  // TODO(dmaretskyi): Pre-parse the input in the compute node instead of exposing this.
  resolveImage(id: string) {
    return this._context?.gpt?.imageCache.get(id);
  }
}
