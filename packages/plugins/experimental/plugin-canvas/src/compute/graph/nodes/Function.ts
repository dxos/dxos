//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, DEFAULT_INPUT, type Binding } from '../compute-node';

export const DefaultInput = S.Struct({ [DEFAULT_INPUT]: S.Any });
export const DefaultOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Any });

export type DefaultInput = S.Schema.Type<typeof DefaultInput>;
export type DefaultOutput = S.Schema.Type<typeof DefaultOutput>;

export type FunctionCallback<INPUT, OUTPUT> = (input: INPUT) => Promise<OUTPUT>;

export class Function<INPUT extends Binding, OUTPUT extends Binding> extends ComputeNode<INPUT, OUTPUT> {
  override readonly type = 'function';

  constructor(
    inputSchema: S.Schema<INPUT>,
    outputSchema: S.Schema<OUTPUT>,
    private readonly _name = 'Function',
  ) {
    super(inputSchema, outputSchema);
  }

  get name() {
    return this._name;
  }

  override async invoke(input: INPUT) {
    const value = (input as any)[DEFAULT_INPUT];
    return {
      [DEFAULT_OUTPUT]: value,
    } as any;
  }
}
