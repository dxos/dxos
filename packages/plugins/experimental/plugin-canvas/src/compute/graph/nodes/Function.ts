//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../../../shapes';
import { ComputeNode } from '../compute-node';

export const DefaultInput = S.Struct({ input: S.Any });
export const DefaultOutput = S.Struct({ result: S.Any });

export type DefaultInput = S.Schema.Type<typeof DefaultInput>;
export type DefaultOutput = S.Schema.Type<typeof DefaultOutput>;

export class Function<Input, Output> extends ComputeNode<Input, Output> {
  override readonly type = 'function';

  get name() {
    return 'Function';
  }

  // TODO(burdon): Should be replaced by actual function (e.g., transformer).
  override async invoke(input: Input) {
    const value = (input as any)[DEFAULT_INPUT];
    const output = {
      [DEFAULT_OUTPUT]: value,
    };

    return output as any as Output;
  }
}
