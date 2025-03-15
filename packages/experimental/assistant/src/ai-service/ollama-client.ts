//
// Copyright 2025 DXOS.org
//

import { type MessageContentBlock, defineTool, type Tool, ToolResult } from '@dxos/artifact';
import { ObjectId, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { MessageCollector, emitMessageAsEvents } from './message-collector';
import { type AIServiceClient, type GenerationStream } from './service';
import { GenerationStreamImpl } from './stream';
import { ToolTypes, type GenerateRequest, type GenerationStreamEvent } from './types';
import { isToolUse, runTools } from '../conversation';

// TODO(burdon): Config.
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2:1b';

export type OllamaClientParams = {
  endpoint?: string;

  /**
   * Tools that are executed within the client.
   */
  tools?: Tool[];

  /**
   * Override generation parameters.
   */
  // TODO(burdon): Why not just options?
  overrides?: {
    model?: string;
    temperature?: number;
  };

  /**
   * Maximum number of tool invocations in a single request that is allowed to run.
   * @default 3
   */
  maxToolInvocations?: number;
};

export class OllamaClient implements AIServiceClient {
  /**
   * Create a test client with small local model and no temperature for predictable results.
   */
  static createClient(options?: Pick<OllamaClientParams, 'tools'>) {
    return new OllamaClient({
      tools: options?.tools,
      overrides: { model: DEFAULT_OLLAMA_MODEL, temperature: 0 },
    });
  }

  /**
   * Check if Ollama server is running and accessible.
   * @returns Promise that resolves to true if Ollama is running, false otherwise.
   */
  static async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${DEFAULT_OLLAMA_URL}/api/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(100),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private readonly _endpoint: string;
  private readonly _tools: Tool[];
  private readonly _modelOverride?: string;
  private readonly _temperatureOverride?: number;
  private readonly _maxToolInvocations: number;

  constructor({ endpoint, tools, overrides, maxToolInvocations }: OllamaClientParams) {
    this._endpoint = endpoint ?? DEFAULT_OLLAMA_URL;
    this._tools = tools ?? [];
    this._modelOverride = overrides?.model;
    this._temperatureOverride = overrides?.temperature;
    this._maxToolInvocations = maxToolInvocations ?? 3;
  }

  private _getEmbededTools(clientTools: Tool[]) {
    return [
      ...this._tools,
      ...clientTools
        .filter((tool) => tool.type !== undefined && WELL_KNOWN_TOOLS[tool.type])
        .map((tool) => WELL_KNOWN_TOOLS[tool.type!]),
    ];
  }

  private async *_generateStream(request: GenerateRequest, signal?: AbortSignal): AsyncIterable<GenerationStreamEvent> {
    invariant(request.prompt === undefined, 'Prompt must be in history');

    // Map DXOS request to Ollama API format.
    const ollamaRequest: OllamaRequest = {
      model: this._modelOverride ?? request.model ?? 'llama3',
      messages: [],
      stream: true,
      options: {
        temperature: this._temperatureOverride ?? 0.7,
      },
    };

    // Add system message if provided.
    if (request.systemPrompt) {
      ollamaRequest.messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // Add history if provided.
    if (request.history?.length) {
      for (const message of request.history) {
        const role = message.role === 'assistant' ? 'assistant' : 'user';

        // Process message content.
        if (message.content.length === 0) {
          // Skip empty messages
          continue;
        }

        for (const content of message.content) {
          switch (content.type) {
            case 'text': {
              ollamaRequest.messages.push({
                role,
                content: content.text,
              });
              break;
            }
            case 'tool_use': {
              ollamaRequest.messages.push({
                role: 'assistant',
                content: '',
                tool_calls: [
                  {
                    function: {
                      name: content.name,
                      arguments: content.input as any,
                    },
                  },
                ],
              });
              break;
            }
            case 'tool_result': {
              ollamaRequest.messages.push({
                role: 'tool',
                content: JSON.stringify({
                  type: 'tool_result',
                  toolUseId: content.toolUseId,
                  content: content.content,
                }),
              });
              break;
            }
          }
        }
      }
    }

    // Add tools if provided.
    if (request.tools?.length || this._tools.length) {
      const allTools = [...(request.tools ?? []), ...this._tools];
      const withWellKnownTools = allTools.map((tool) =>
        tool.type !== undefined && WELL_KNOWN_TOOLS[tool.type] ? WELL_KNOWN_TOOLS[tool.type] : tool,
      );

      if (withWellKnownTools.length > 0) {
        ollamaRequest.tools = withWellKnownTools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: {
              type: 'object',
              properties: tool.parameters?.properties,
              required: tool.parameters?.required,
            },
          },
        }));
      }
    }

    log.info('generate request', { history: request.history, prompt: request.prompt, ollamaRequest });

    const response = await fetch(`${this._endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
      signal,
    });

    // log.info('ollama response', { response: await response.text() });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Ollama API returned no response body');
    }

    // Create the stream
    const reader = response
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(new OllamaDecoderStream())
      .getReader();

    try {
      // Create a message ID.
      const messageId = ObjectId.random();

      // Send message_start event with proper message structure.
      yield {
        type: 'message_start',
        message: {
          id: messageId,
          role: 'assistant',
          content: [],
        },
      } as GenerationStreamEvent;

      // Initialize text content block.
      const textBlock: MessageContentBlock = {
        type: 'text',
        text: '',
      };

      let currentBlockIndex = 0;

      // Send content_block_start event.
      yield {
        type: 'content_block_start',
        index: currentBlockIndex,
        content: textBlock,
      } as GenerationStreamEvent;

      while (true) {
        const { done, value: data } = await reader.read();

        if (done) {
          break;
        }

        log.info('ollama data', { data });

        // Ollama sends chunks of text, we convert them to our event format.
        if (data.message?.content) {
          yield {
            type: 'content_block_delta',
            index: 0,
            delta: {
              type: 'text_delta',
              text: data.message.content,
            },
          } as GenerationStreamEvent;
        }

        // If tool usage is detected.
        if (data.message?.tool_calls && data.message?.tool_calls?.length > 0) {
          if (data.message.tool_calls.length > 1) {
            log.warn('Ollama returned multiple tool calls. Only the first one will be used.');
          }

          yield {
            type: 'content_block_stop',
            index: currentBlockIndex++,
          } as GenerationStreamEvent;

          yield {
            type: 'content_block_start',
            index: currentBlockIndex,
            content: {
              type: 'tool_use',
              id: ObjectId.random(),
              name: data.message.tool_calls[0].function.name,
              input: sanitizeToolArguments(data.message.tool_calls[0].function.arguments),
            },
          } as GenerationStreamEvent;

          yield {
            type: 'message_delta',
            delta: {
              stopReason: 'tool_use',
            },
          } as GenerationStreamEvent;
        }
      }

      // Send content_block_stop and message_stop events.
      yield {
        type: 'content_block_stop',
        index: currentBlockIndex,
      } as GenerationStreamEvent;

      yield {
        type: 'message_stop',
      } as GenerationStreamEvent;
    } finally {
      reader.releaseLock();
    }
  }

  async exec(request: GenerateRequest): Promise<GenerationStream> {
    const controller = new AbortController();

    try {
      return new GenerationStreamImpl(
        controller,
        async function* (this: OllamaClient) {
          const collector = new MessageCollector();

          // Loop while running tools.
          let toolInvocations = 0;
          while (true) {
            for await (const event of this._generateStream(
              {
                ...request,
                history: [
                  ...(request.history ?? []),
                  ...(request.prompt ? [request.prompt] : []),
                  ...collector.messages,
                ],
                prompt: undefined,
              },
              controller.signal,
            )) {
              collector.push(event);
              yield event;
            }

            if (
              collector.messages.length > 0 &&
              !isToolUse(collector.messages.at(-1)!, {
                onlyToolNames: this._getEmbededTools(request.tools ?? []).map((tool) => tool.name),
              })
            ) {
              break;
            }

            if (++toolInvocations > this._maxToolInvocations) {
              throw new Error('Maximum number of tool invocations reached');
            }

            const result = await runTools({
              message: collector.messages.at(-1)!,
              tools: this._getEmbededTools(request.tools ?? []),
            });

            switch (result.type) {
              case 'continue': {
                collector.pushMessage(result.message);
                yield* emitMessageAsEvents(result.message);
                break;
              }
              case 'break': {
                throw new Error('Tool use breaks not allowed');
              }
            }
          }
        }.bind(this),
      );
    } catch (error) {
      controller.abort();
      throw error;
    }
  }
}

const sanitizeToolArguments = (args: any) => {
  // TODO(dmaretskyi): Workaround for model bug.
  if (args.type === 'object' && typeof args.properties === 'object' && Array.isArray(args.required)) {
    return args.properties;
  }

  return args;
};

const SAMPLE_IMAGE_URL = 'https://images.nightcafe.studio/jobs/BNmcRhHCM1JRKoUtqSei/BNmcRhHCM1JRKoUtqSei--1--5b9rv.jpg';

const WELL_KNOWN_TOOLS: Record<string, Tool> = {
  [ToolTypes.TextToImage]: defineTool('system', {
    name: 'text-to-image',
    description: 'Generate an image from a text prompt',
    schema: S.Struct({
      prompt: S.String.annotations({ description: 'The text prompt describing the image to generate' }),
    }),
    execute: async ({ prompt }) => {
      const image = await fetch(SAMPLE_IMAGE_URL).then(async (res) => Buffer.from(await res.arrayBuffer()));

      const imageBase64 = image.toString('base64');
      const id = ObjectId.random();

      return ToolResult.Success(`The generation was successful. Image ID: ${id} Prompt: ${prompt}`, [
        {
          type: 'image',
          id,
          source: {
            type: 'base64',
            mediaType: 'image/jpeg',
            data: imageBase64,
          },
        },
      ]);
    },
  }),
};

type OllamaMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

type OllamaRequest = {
  model: string;
  messages: Array<OllamaMessage>;
  stream: boolean;
  options?: {
    temperature?: number;
  };
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters?: any;
    };
  }>;
};

type OllamaResponseData = {
  message?: OllamaMessage;
};

class OllamaDecoderStream extends TransformStream<string, OllamaResponseData> {
  private _buffer = '';

  constructor() {
    super({
      transform: (chunk, controller) => {
        this._buffer += chunk;
        const lines = this._buffer.split('\n');
        this._buffer = lines.pop() || '';
        for (const line of lines) {
          controller.enqueue(JSON.parse(line.trim()));
        }
      },
      flush: (controller) => {
        this._buffer = this._buffer.trim();
        if (this._buffer.length > 0) {
          controller.enqueue(JSON.parse(this._buffer));
        }
      },
    });
  }
}
