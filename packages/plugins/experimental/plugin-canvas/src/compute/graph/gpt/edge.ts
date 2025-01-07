import type { AIServiceClientImpl, LLMTool, LLMToolDefinition, MessageImageContentBlock } from '@dxos/assistant';
import { log } from '@dxos/log';
import { isNotNullOrUndefined } from '@dxos/util';
import { type GptExecutor } from '../state-machine';
import { type Message, ObjectId, runLLM } from '@dxos/assistant';
import { SpaceId } from '@dxos/client/echo';
import type { GptInput, GptOutput } from '../nodes/GptFunction';

export class EdgeGpt implements GptExecutor {
  public readonly imageCache = new Map<string, MessageImageContentBlock>();

  constructor(private readonly _client: AIServiceClientImpl) {}

  public async invoke({ systemPrompt, prompt, tools: toolsInput, history = [] }: GptInput): Promise<GptOutput> {
    log.info('callEdge', { systemPrompt, prompt, toolsInput, history });

    let tools: LLMTool[] = (toolsInput as any) ?? [];
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

    await this._client.insertMessages(newMessages);

    log.info('gpt', { systemPrompt, prompt, history, tools });
    const messages: Message[] = [];
    await runLLM({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      tools,
      spaceId,
      threadId,
      system: systemPrompt,
      client: this._client,
      logger: (event) => {
        log.info('event', { event });
        switch (event.type) {
          case 'message': {
            messages.push(event.message);
            for (const content of event.message.content) {
              if (content.type === 'image' && content.id != null && content.source != null) {
                log.info('image', { id: content.id });
                this.imageCache.set(content.id, content);
              }
            }
            break;
          }
          case 'message_start': {
            messages.push(event.message as any);
            for (const content of event.message.content) {
              if (content.type === 'image' && content.id != null && content.source != null) {
                log.info('image', { id: content.id });
                this.imageCache.set(content.id, content);
              }
            }
            break;
          }
          case 'content_block_start': {
            if (event.content.type === 'image' && event.content.id != null && event.content.source != null) {
              log.info('image', { id: event.content.id });
              this.imageCache.set(event.content.id, event.content);
            }
            break;
          }
        }
      },
    });

    const outputMessages = messages.flatMap(({ role, content }) =>
      content.flatMap((content) => {
        switch (content.type) {
          case 'text': {
            const textWithoutCot = content.text
              .replace(/<cot>[\s\S]*?<\/cot>/g, '')
              .replace(/<artifact>[\s\S]*?<\/artifact>/g, '')
              .trim();
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

    const artifacts = messages.flatMap(({ role, content }) =>
      content.flatMap((content) => {
        switch (content.type) {
          case 'text': {
            const artifactMatch = content.text.match(/<artifact>([\s\S]*?)<\/artifact>/);
            return artifactMatch ? [artifactMatch[1].trim()] : [];
          }
          default:
            return [];
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
      artifact: artifacts.join('\n'),
    };
  }
}
