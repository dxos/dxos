//
// Copyright 2024 DXOS.org
//

import { LLMTool, EchoDataSource, LLMToolDefinition, ToolTypes } from '@dxos/assistant';
import { createCypherTool } from '@dxos/assistant/testing';
import { raise } from '@dxos/debug';
import { getSchemaTypename, S, StoredSchema } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, NoInput } from '../compute-node';
import { InvalidStateError, type StateMachineContext } from '../state-machine';
import type { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { createOutputSchema } from '../../shapes/defs';
import { log } from '@dxos/log';

/**
 * Text to image tool.
 */
export class TextToImage extends ComputeNode<NoInput, { [DEFAULT_OUTPUT]: LLMTool }> {
  override readonly type = 'textToImage';

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
  name: 'textToImage',
  type: ToolTypes.TextToImage,
};
