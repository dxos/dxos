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

import {
  defineTool,
  Message,
  ToolResult,
  type ArtifactDefinition,
  type MessageContentBlock,
  type Tool,
} from '@dxos/artifact';
import {
  isToolUse,
  MixedStreamParser,
  runTools,
  type AIServiceClient,
  type GenerateRequest,
  type GenerationStream,
} from '@dxos/assistant';
import { Event, synchronized } from '@dxos/async';
import { createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Schema as S } from 'effect';

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

  /**
   * User prompt or tool result.
   */
  public readonly userMessage = new Event<Message>();

  constructor() {
    // Message complete.
    this._parser.message.on((message) => {
      this._pending.push(message);
    });
  }

  @synchronized
  async run(options: SessionRunOptions): Promise<Message[]> {
    const systemTools: Tool[] = [
      defineTool('system', {
        name: 'query_artifacts',
        description: 'Query the available artifacts',
        schema: S.Struct({}),
        execute: async () => {
          return ToolResult.Success({
            artifacts: options.artifacts.map((artifact) => ({
              id: artifact.id,
              name: artifact.name,
              description: artifact.description,
            })),
          });
        },
      }),
      defineTool('system', {
        name: 'require_artifacts',
        description:
          'Require the use of specific artifacts. This will allow the model to interact with artifacts and use their tools.',
        schema: S.Struct({
          artifactIds: S.Array(S.String).annotations({ description: 'The ids of the artifacts to require' }),
        }),
        execute: async ({ artifactIds }) => {
          const missingArtifactIds = artifactIds.filter(
            (artifactId) => !options.artifacts.some((artifact) => artifact.id === artifactId),
          );
          if (missingArtifactIds.length > 0) {
            return ToolResult.Error(`One or more artifact ids are invalid: ${missingArtifactIds.join(', ')}`);
          }

          for (const artifactId of artifactIds) {
            requiredArtifactIds.add(artifactId);
          }

          return ToolResult.Success({});
        },
      }),
    ];
    this._history = options.history;
    this._pending = [
      createStatic(Message, {
        role: 'user',
        content: [{ type: 'text', text: options.prompt }],
      }),
    ];
    this.userMessage.emit(this._pending.at(-1)!);
    this._stream = undefined;
    let error: Error | undefined = undefined;

    let requiredArtifactIds = new Set<string>();
    try {
      let more = false;
      do {
        const tools = [
          ...systemTools,
          ...options.tools,
          ...options.artifacts
            .filter((artifact) => requiredArtifactIds.has(artifact.id))
            .flatMap((artifact) => artifact.tools),
        ];

        log('request', {
          pending: this._pending.length,
          history: this._history.length,
          tools: tools.map((tool) => tool.name),
        });

        // Open request stream.
        this._stream = await options.client.exec({
          ...(options.generationOptions ?? {}),
          // TODO(burdon): Rename messages or separate history/message.
          history: [...this._history, ...this._pending],
          tools,
          systemPrompt: BASE_INSTRUCTIONS,
        });

        // Wait until complete.
        await this._parser.parse(this._stream);
        await this._stream.complete();

        // Add messages.
        log('response', { pending: this._pending });

        // Resolve tool use locally.
        more = false;
        const message = this._pending.at(-1);
        invariant(message);
        if (isToolUse(message)) {
          log('tool request...');
          const response = await runTools({
            message: this._pending.at(-1)!,
            tools: tools,
            extensions: options.extensions ?? {},
          });

          log('tool response', { response });
          switch (response.type) {
            case 'continue': {
              this._pending = [...this._pending, response.message];
              this.userMessage.emit(response.message);
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

const BASE_INSTRUCTIONS = `

You are a friendly, advanced AI assistant capable of creating and managing artifacts from available data and tools. 
Your task is to process user commands and questions and decide how best to respond.
In some cases, you will need to create or reference data objects called artifacts.

Follow these guidelines carefully:

Decision-making:

 - Analyze the structure and type of the content in the user's message.
 - Identify which artifacts are relevant to the user's request.
 - Query the list of available artifacts using the appropriate tool.
 - Select which artifact(s) will be the most relevant and require them using the require_artifacts tool.
 - The require'd artifact tools will be available for use after require.
`;

export class AIServiecOverloadedError extends S.TaggedError<AIServiecOverloadedError>()(
  'AIServiecOverloadedError',
  {},
) {}
