//
// Copyright 2024 DXOS.org
//

import { LLMTool, ToolTypes } from '@dxos/assistant';
import type { Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, NoInput } from '../compute-node';
import { InvalidStateError, type StateMachineContext } from '../state-machine';

/**
 * Text to image tool.
 */
export class TextToImage extends ComputeNode<NoInput, { [DEFAULT_OUTPUT]: LLMTool }> {
  override readonly type = 'text-to-image';

  constructor() {
    super(NoInput, S.Struct({ [DEFAULT_OUTPUT]: LLMTool }));
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }

  override async onInitialize(ctx: Context, context: StateMachineContext): Promise<void> {
    this.setOutput({ [DEFAULT_OUTPUT]: textToImageTool });
  }
}

const textToImageTool: LLMTool = {
  name: 'text-to-image',
  type: ToolTypes.TextToImage,
};
