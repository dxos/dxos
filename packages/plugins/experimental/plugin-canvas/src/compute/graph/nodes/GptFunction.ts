//
// Copyright 2025 DXOS.org
//

import {
  runLLM,
  AIServiceClientImpl,
  type LLMToolDefinition,
  type Message,
  ObjectId, // TODO(burdon): Reconcile with echo-schema.
} from '@dxos/assistant';
import { SpaceId } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNotNullOrUndefined } from '@dxos/util';

import { Function, type FunctionCallback } from './Function';
import { GptInput, GptOutput } from '../../shapes';
import { type StateMachineContext } from '../state-machine';

export class GptFunction extends Function<GptInput, GptOutput> {
  constructor() {
    super(GptInput, GptOutput, 'GPT');
  }

  _cb?: FunctionCallback<GptInput, GptOutput>;

  protected override onInitialize(ctx: Context, context: StateMachineContext) {
    switch (context?.model) {
      case '@anthropic/claude-3-5-sonnet-20241022': {
        this._cb = callEdge(
          new AIServiceClientImpl({
            // TODO(burdon): Move to config.
            // endpoint: 'http://localhost:8787',
            endpoint: 'https://ai-service.dxos.workers.dev',
          }),
        );
        break;
      }

      case '@ollama/llama-3-2-3b':
      default: {
        // this._cb = callOllama;
      }
    }
  }

  override async invoke(input: GptInput) {
    invariant(this._cb);
    return this._cb!(input);
  }
}

//
// Ollama
//

// TODO(burdon): Make pluggable since should not be bundled.
// const callOllama: FunctionCallback<GptInput, GptOutput> = async ({ systemPrompt, prompt, history = [] }) => {
//   const messages = [
//     ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
//     ...history.map(({ role, message }) => ({ role, content: message })),
//     { role: 'user', content: prompt },
//   ];
//
//   const result = await ollama.chat({ model: 'llama3.2', messages });
//   log.info('gpt', { prompt, result });
//   const { message, eval_count } = result;
//
//   return {
//     tokens: eval_count,
//     result: [
//       {
//         role: 'user',
//         message: prompt,
//       },
//       {
//         role: message.role as any,
//         message: message.content,
//       },
//     ],
//   };
// };

//
// EDGE
//

const callEdge =
  (client: AIServiceClientImpl): FunctionCallback<GptInput, GptOutput> =>
  async ({ systemPrompt, prompt, tools: toolsInput, history = [] }) => {
    log.info('callEdge', { systemPrompt, prompt, toolsInput, history });

    let tools: LLMToolDefinition[] = [];
    if (toolsInput === undefined) {
      tools = [];
    }

    if (!Array.isArray(toolsInput)) {
      tools = [toolsInput as any];
    }

    tools = tools.filter(isNotNullOrUndefined);

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
          messages.push(event.message);
        }
      },
    });

    const outputMessages = messages.flatMap(({ role, content }) =>
      content.flatMap((content) => {
        switch (content.type) {
          case 'text': {
            const textWithoutCot = content.text.replace(/<cot>[\s\S]*?<\/cot>/g, '').trim();
            return textWithoutCot ? [{ role, message: textWithoutCot }] : [];
          }
          default:
            return [];
        }
      }),
    );

    const chainOfThought = messages.flatMap(({ role, content }) =>
      content.map((content) => {
        switch (content.type) {
          case 'text': {
            const cotMatch = content.text.match(/<cot>([\s\S]*?)<\/cot>/);
            return cotMatch ? cotMatch[1].trim() : '';
          }
          case 'tool_use':
            return JSON.stringify(content);
          case 'tool_result':
            return content.content;
          default:
            return '';
        }
      }),
    );

    return {
      result: [
        {
          role: 'user',
          message: prompt,
        },
        ...outputMessages,
      ],
      tokens: 0,
      cot: chainOfThought.join('\n'),
    };
  };
