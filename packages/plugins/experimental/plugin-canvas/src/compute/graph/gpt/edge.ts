import type { AIServiceClientImpl, LLMToolDefinition } from '@dxos/assistant';
import { log } from '@dxos/log';
import { isNotNullOrUndefined } from '@dxos/util';
import { type GptExecutor } from '../state-machine';
import { type Message, ObjectId, runLLM } from '@dxos/assistant';
import { SpaceId } from '@dxos/client/echo';

export const callEdge =
  (client: AIServiceClientImpl): GptExecutor =>
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
