//
// Copyright 2025 DXOS.org
//

import ollama from 'ollama';

import {
  AIServiceClientImpl,
  runLLM,
  type LLMToolDefinition,
  type Message,
  type MessageTextContentBlock,
  ObjectId,
} from '@dxos/assistant';
import { SpaceId } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { log } from '@dxos/log';

import { Function, type FunctionCallback } from './Function';
import { GptInput, GptOutput } from '../../shapes';
import { type StateMachineContext } from '../state-machine';

export class GptFunction extends Function<GptInput, GptOutput> {
  constructor() {
    super(GptInput, GptOutput, undefined, 'GPT');
  }

  // TODO(burdon): Fix abstraction: should just be Function.
  protected override onInitialize(ctx: Context, context: StateMachineContext) {
    switch (this._context?.model) {
      case '@anthropic/claude-3-5-sonnet-20241022': {
        this._cb = callEdge(
          new AIServiceClientImpl({
            // TODO(burdon): Move to config.
            endpoint: 'http://localhost:8787',
          }),
        );
        break;
      }

      case '@ollama/llama-3-2-3b':
      default: {
        this._cb = callOllama;
      }
    }
  }
}

//
// Ollama
//

const callOllama: FunctionCallback<GptInput, GptOutput> = async ({ systemPrompt, prompt, history = [] }) => {
  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...history.map(({ role, message }) => ({ role, content: message })),
    { role: 'user', content: prompt },
  ];

  const result = await ollama.chat({ model: 'llama3.2', messages });
  log.info('gpt', { prompt, result });
  const { message, eval_count } = result;

  return {
    tokens: eval_count,
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
  };
};

//
// EDGE
//

const callEdge =
  (client: AIServiceClientImpl): FunctionCallback<GptInput, GptOutput> =>
  async ({ systemPrompt, prompt, tools: toolsInput, history = [] }) => {
    let tools: LLMToolDefinition[] = [];
    if (toolsInput === undefined) {
      tools = [];
    }

    if (!Array.isArray(toolsInput)) {
      tools = [toolsInput as any];
    }

    const spaceId = SpaceId.random(); // TODO(dmaretskyi): Use spaceId from the context.
    const threadId = ObjectId.random();

    const newMessages: Message[] = [
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

    await client.insertMessages(newMessages);

    log.info('gpt', { systemPrompt, prompt, history });
    const messages: Message[] = [];
    await runLLM({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      tools,
      spaceId,
      threadId,
      system: systemPrompt,
      client,
      logger: (event) => {
        if (event.type === 'message') {
          console.log('MSG', event.message);
          messages.push(event.message);
        }
      },
    });

    return {
      result: [
        {
          role: 'user',
          message: prompt,
        },
        ...messages.flatMap(({ role, content }) =>
          content.flatMap((content) =>
            content.type === 'text'
              ? [{ role, message: content.text }]
              : content.type === 'tool_use'
                ? [{ role, message: JSON.stringify(content) }]
                : [],
          ),
        ),
      ],
      tokens: 0,
    };
  };
