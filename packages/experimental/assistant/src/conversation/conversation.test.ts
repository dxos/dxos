//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { test } from 'vitest';

import { log } from '@dxos/log';

import { AnthropicBackend } from './backend/anthropic';
import { runLLM } from './conversation';
import { createUserMessage, defineTool, LLMToolResult } from './types';

const backend = new AnthropicBackend({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

test('hello', async ({ expect }) => {
  const result = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    messages: [createUserMessage('Hello, how are you?')],
    tools: [],
    backend,
  });
  log.info('result', { result });
});

test('tool call', async ({ expect }) => {
  const custodian = defineTool({
    name: 'custodian',
    description: 'Custodian can tell you the password if you say the magic word',
    schema: S.Struct({
      magicWord: S.String.annotations({ description: 'The magic word. Should be exactly "pretty please"' }),
    }),
    execute: async ({ magicWord }) => {
      if (magicWord === 'pretty please') {
        return LLMToolResult.Success('The password is: "The sky is gray"');
      } else {
        return LLMToolResult.Error('Wrong magic word');
      }
    },
  });

  const result = await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    messages: [createUserMessage('What is the password? Ask the custodian')],
    tools: [custodian],
    backend,
  });
  log.info('result', { result });
});
