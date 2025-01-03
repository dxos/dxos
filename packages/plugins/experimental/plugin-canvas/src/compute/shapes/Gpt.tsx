//
// Copyright 2024 DXOS.org
//

import ollama from 'ollama/browser';
import React from 'react';

import {
  LLMToolDefinition,
  ObjectId,
  type MessageTextContentBlock,
  LLMTool,
  AIServiceClientImpl,
  type Message,
  runLLM,
} from '@dxos/assistant';
import { AST, S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { SpaceId } from '@dxos/react-client/echo';

import { FunctionBody, getAnchors, getHeight } from './Function';
import { ComputeShape } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { Function, type FunctionCallback } from '../graph';

const USE_AI_SERVICE = true;

export const GptShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('gpt'),
  }),
);

export const GptMessage = S.Struct({
  role: S.Union(S.Literal('system'), S.Literal('user'), S.Literal('assistant')),
  message: S.String,
});

export type GptMessage = S.Schema.Type<typeof GptMessage>;

export const GptInput = S.Struct({
  systemPrompt: S.optional(S.String),
  prompt: S.String,
  history: S.optional(S.Array(GptMessage)),
  tools: S.optional(S.Array(LLMToolDefinition)),
});

export const GptOutput = S.Struct({
  result: S.Array(GptMessage),
  tokens: S.Number,
});

export type GptInput = S.Schema.Type<typeof GptInput>;
export type GptOutput = S.Schema.Type<typeof GptOutput>;

export type GptShape = ComputeShape<S.Schema.Type<typeof GptShape>, Function<GptInput, GptOutput>>;

export type CreateGptProps = Omit<GptShape, 'type' | 'node' | 'size'>;

export const createGpt = ({ id, ...rest }: CreateGptProps): GptShape => {
  return {
    id,
    type: 'gpt',
    node: new Function(GptInput, GptOutput, USE_AI_SERVICE ? callAiService : callOllama, 'GPT'),
    size: { width: 192, height: getHeight(GptInput) },
    ...rest,
  };
};

export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {
  const inputs = AST.getPropertySignatures(shape.node.inputSchema.ast).map(({ name }) => name.toString());
  return <FunctionBody name={shape.node.name} inputs={inputs} />;
};

export const gptShape: ShapeDef<GptShape> = {
  type: 'gpt',
  icon: 'ph--brain--regular',
  component: GptComponent,
  createShape: createGpt,
  getAnchors: (shape) => getAnchors(shape, shape.node.inputSchema, shape.node.outputSchema),
};

const callOllama: FunctionCallback<GptInput, GptOutput> = async ({ systemPrompt, prompt, history = [] }) => {
  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...history.map(({ role, message }) => ({
      role,
      content: message,
    })),
    { role: 'user', content: prompt },
  ];

  const result = await ollama.chat({ model: 'llama3.2', messages });
  log.info('gpt', { prompt, result });
  const { message, eval_count } = result;

  return {
    result: [
      {
        role: 'user',
        message: prompt,
      },
      {
        role: message.role as any,
        message: message.content,
      },
    ],
    tokens: eval_count,
  };
};

const callAiService: FunctionCallback<GptInput, GptOutput> = async ({
  systemPrompt,
  prompt,
  tools: toolsInput,
  history = [],
}) => {
  let tools: LLMToolDefinition[] = [];
  if (toolsInput === undefined) {
    tools = [];
  }

  if (!Array.isArray(toolsInput)) {
    tools = [toolsInput as any];
  }

  const spaceId = SpaceId.random(); // TODO(dmaretskyi): Use spaceId from the context.
  const threadId = ObjectId.random();

  const messages: Message[] = [
    ...history.map(({ role, message }) => ({
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: role === 'system' ? 'user' : role,
      content: [
        {
          type: 'text' as const,
          text: message,
        },
      ],
    })),
    {
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: 'user',
      content: [
        {
          type: 'text' as const,
          text: prompt,
        },
      ],
    },
  ];

  await aiServiceClient.insertMessages(messages);

  log.info('gpt', { systemPrompt, prompt, history });
  const newMessages: Message[] = [];
  await runLLM({
    model: '@anthropic/claude-3-5-sonnet-20241022',
    tools,
    spaceId,
    threadId,
    system: systemPrompt,
    client: aiServiceClient,
    logger: (event) => {
      if (event.type === 'message') {
        newMessages.push(event.message);
      }
    },
  });

  return {
    result: [
      {
        role: 'user',
        message: prompt,
      },
      ...newMessages.map(({ role, content }) => ({
        role,
        message: (content.findLast(({ type }) => type === 'text') as MessageTextContentBlock)?.text ?? '',
      })),
    ],
    tokens: 0,
  };
};

const AI_SERVICE_ENDPOINT = 'http://localhost:8787';

const aiServiceClient = new AIServiceClientImpl({
  endpoint: AI_SERVICE_ENDPOINT,
});
