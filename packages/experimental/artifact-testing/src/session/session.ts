/**
 * Contains message history, tools, current context.
 * Current context means the state of the app, time of day, and other contextual information.
 * It makes requests to the model, its a state machine.
 * It keeps track of the current goal.
 * It manages the context window.
 * Tracks the success criteria of reaching the goal, exposing metrics (stretch)
 * Could be run locally in the app or remotely.
 * Could be personal or shared.
 */

import { Message, type ArtifactDefinition, type MessageContentBlock, type Tool } from '@dxos/artifact';
import {
  isToolUse,
  MixedStreamParser,
  runTools,
  type AIServiceClient,
  type GenerateRequest,
  type GenerationStream,
} from '@dxos/assistant';
import { synchronized } from '@dxos/async';
import { createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Schema } from 'effect';

export type SessionRunOptions = {
  client: AIServiceClient;

  artifacts: ArtifactDefinition[];

  /**
   * Non-artifact specific tools.
   */
  tools: Tool[];

  history: Message[];

  prompt: string;

  generationOptions?: Pick<GenerateRequest, 'model' | 'systemPrompt'>;

  extensions?: ToolContextExtensions;
};

export class AISession {
  /** SSE stream parser. */
  private readonly _parser = new MixedStreamParser();

  /** Pending messages (incl. the current user request). */
  private _pending: Message[] = [];

  /** Current streaming response. */
  private _stream: GenerationStream | undefined;

  /** Prior history from queue. */
  private _history: Message[] = [];

  /**
   * New message.
   */
  public message = this._parser.message;

  /**
   * Complete block added to Message.
   */
  public block = this._parser.block;

  /**
   * Update partial block (while streaming).
   */
  public update = this._parser.update;

  public streamEvent = this._parser.streamEvent;

  constructor() {
    // Message complete.
    this._parser.message.on((message) => {
      this._pending.push(message);
    });
  }

  @synchronized
  async run(options: SessionRunOptions): Promise<Message[]> {
    this._history = options.history;
    this._pending = [
      createStatic(Message, {
        role: 'user',
        content: [{ type: 'text', text: options.prompt }],
      }),
    ];
    this._stream = undefined;
    let error: Error | undefined = undefined;

    try {
      let more = false;
      do {
        log.info('request', {
          pending: this._pending.length,
          history: this._history.length,
          tools: options.tools.map((tool) => tool.name),
        });

        // Open request stream.
        this._stream = await options.client.exec({
          ...(options.generationOptions ?? {}),
          // TODO(burdon): Rename messages or separate history/message.
          history: [...this._history, ...this._pending],
          tools: options.tools, // TODO(dmaretskyi): add in required artifacts
        });

        // Wait until complete.
        await this._parser.parse(this._stream);
        await this._stream.complete();

        // Add messages.
        log.info('response', { pending: this._pending });

        // Resolve tool use locally.
        more = false;
        const message = this._pending.at(-1);
        invariant(message);
        if (isToolUse(message)) {
          log('tool request...');
          const response = await runTools({
            message: this._pending.at(-1)!,
            tools: options.tools,
            extensions: options.extensions ?? {},
          });

          log('tool response', { response });
          switch (response.type) {
            case 'continue': {
              this._pending = [...this._pending, response.message];
              more = true;
              break;
            }
          }
        }
      } while (more);
    } catch (err) {
      log.catch(err);
      if (err instanceof Error && err.message.includes('Overloaded')) {
        error = new AIServiecOverloadedError('AI service overloaded', { cause: err });
      } else {
        error = new Error('AI service error', { cause: err });
      }
    } finally {
      this._stream = undefined;
    }

    if (error) {
      throw error;
    }

    return this._pending;
  }
}

export class AIServiecOverloadedError extends Schema.TaggedError<AIServiecOverloadedError>()(
  'AIServiecOverloadedError',
  {},
) {}
