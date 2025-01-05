//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, type DefaultOutput, NoInput } from '../compute-node';

/**
 * Switch outputs true when set.
 */
export class Switch extends ComputeNode<NoInput, DefaultOutput<boolean>> {
  override readonly type = 'switch';

  private _enabled = false;

  constructor() {
    super(NoInput, S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  setEnabled(value: boolean) {
    if (this._enabled !== value) {
      this._enabled = value;
      this.setOutput({ [DEFAULT_OUTPUT]: value });
    }

    return this;
  }

  override async invoke() {
    return { [DEFAULT_OUTPUT]: this._enabled };
  }
}
