//
// Copyright 2024 DXOS.org
//

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, NoInput } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * Switch outputs true when set.
 */
export class Switch extends ComputeNode<NoInput, { [DEFAULT_OUTPUT]: boolean }> {
  override readonly type = 'switch';

  private _enabled = false;

  constructor() {
    super(NoInput, S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  override async invoke() {
    return { [DEFAULT_OUTPUT]: this._enabled };
  }

  setEnabled(value: boolean) {
    if (this._enabled === value) {
      return this;
    }

    this._enabled = value;
    this.setOutput({ [DEFAULT_OUTPUT]: value });
    return this;
  }
}
