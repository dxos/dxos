//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { defineTool, Message, ToolResult, type ArtifactDefinition, type Tool } from '@dxos/artifact';
import { Event, synchronized } from '@dxos/async';
import { createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { MixedStreamParser, type AIServiceClient, type GenerateRequest, type GenerationStream } from '../ai-service';
import { isToolUse, runTools } from '../conversation';
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

  /**
   * Pre-require artifacts.
   */
  requiredArtifactIds?: string[];
};

type OperationModel = 'planning' | 'immediate';

export type AiSessionOptions = {
  /**
   * In planning mode, the model will create a plan before executing the user's request.
   * The plan will determine the artifacts that will be used to perform the actions.
   * In require mode, the model will select the artifacts that will be used to perform the actions.
   */
  operationModel: OperationModel;
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
  public readonly message = this._parser.message;

  /**
   * Complete block added to Message.
   */
  public readonly block = this._parser.block;

  /**
   * Update partial block (while streaming).
   */
  public readonly update = this._parser.update;

  public readonly streamEvent = this._parser.streamEvent;

  /**
   * User prompt or tool result.
   */
  public readonly userMessage = new Event<Message>();

  constructor(private readonly _options: AiSessionOptions) {
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
    ];
    switch (this._options.operationModel) {
      case 'planning':
        systemTools.push(
          defineTool('system', {
            name: 'create_plan',
            description:
              'Create a plan. Make sure that each step is independent and can be executed solely on the data returned by the previous step. The steps only share the data that is specified in the plan.',
            schema: S.Struct({
              goal: S.String.annotations({ description: 'The goal that the plan will achieve.' }),
              steps: S.Array(
                S.Struct({
                  action: S.String.annotations({
                    description: 'Complete, detailed action to perform.',
                  }),
                  input: S.String.annotations({
                    description: 'The required input data for this step. First step must not require any data.',
                  }),
                  output: S.String.annotations({
                    description: 'The output data from this step. This is passed to the next step as input.',
                  }),
                  requiredArtifactIds: S.Array(S.String).annotations({
                    description: 'The ids of the artifacts required to perform this step.',
                    examples: [['artifact:dxos.org/example/Test']],
                  }),
                }),
              ).annotations({ description: 'Steps' }),
            }),
            execute: async ({ goal, steps }) => {
              const missingArtifactIds = steps
                .flatMap((step) => step.requiredArtifactIds)
                .filter((artifactId) => !options.artifacts.some((artifact) => artifact.id === artifactId));
              if (missingArtifactIds.length > 0) {
                return ToolResult.Error(`One or more artifact ids are invalid: ${missingArtifactIds.join(', ')}`);
              }

              const stepResults: any[] = [];
              for (const step of steps) {
                log.info('executing step', { action: step.action });
                const session = new AISession({ operationModel: 'immediate' });
                session.message.on((ev) => this.message.emit(ev));
                session.block.on((ev) => this.block.emit(ev));
                session.update.on((ev) => this.update.emit(ev));
                session.streamEvent.on((ev) => this.streamEvent.emit(ev));
                session.userMessage.on((ev) => this.userMessage.emit(ev));

                const messages = await session.run({
                  client: options.client,
                  artifacts: options.artifacts,
                  tools: options.tools,
                  history: options.history,
                  extensions: options.extensions,
                  generationOptions: options.generationOptions,
                  requiredArtifactIds: step.requiredArtifactIds.slice(),
                  prompt: `
                    You are an agent that executes the subtask in a plan.
                    
                    While you know the plan's goal only focus on your subtask
                    Use the data from the previous step to complete your task.
                    Return all of the data from "output" in your last message.
                    
                    Current step (that you need to complete):
                    ${JSON.stringify(
                      {
                        goal,
                        input: step.input,
                        output: step.output,
                        yourTask: step.action,
                      },
                      null,
                      2,
                    )}
                    
                    Previous step results:
                    ${JSON.stringify(stepResults.at(-1))}.
                  `,
                });
                const result = messages.at(-1);
                stepResults.push(result);
              }

              return ToolResult.Success({ stepResults });
            },
          }),
        );
        break;
      case 'immediate':
        systemTools.push(
          defineTool('system', {
            name: 'require_artifacts',
            description:
              'Require the use of specific artifacts. This will allow the model to interact with artifacts and use their tools.',
            schema: S.Struct({
              artifactIds: S.Array(S.String).annotations({
                description: 'The ids of the artifacts to require',
                examples: [['artifact:dxos.org/example/Test']],
              }),
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
        );
        break;
    }

    this._history = [...options.history];
    this._pending = [
      createStatic(Message, {
        role: 'user',
        content: [{ type: 'text', text: options.prompt }],
      }),
    ];
    this.userMessage.emit(this._pending.at(-1)!);
    this._stream = undefined;
    let error: Error | undefined;

    const requiredArtifactIds = new Set<string>(options.requiredArtifactIds ?? []);
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
          systemPrompt: createBaseInstructions({
            availableArtifacts: Array.from(requiredArtifactIds),
            operationModel: this._options.operationModel,
          }),
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
            tools,
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

  abort() {
    this._stream?.abort();
  }
}

// TODO(burdon): Use handlebars template with effect-schema input.
const createBaseInstructions = ({
  availableArtifacts,
  operationModel,
}: {
  availableArtifacts: string[];
  operationModel: OperationModel;
}) => `
  You are a friendly, advanced AI assistant capable of creating and managing artifacts from available data and tools. 
  Your task is to process user commands and questions and decide how best to respond.
  In some cases, you will need to create or reference data objects called artifacts.

  Follow these guidelines carefully:

  Decision-making:

  - Analyze the structure and type of the content in the user's message.
  - Can you complete the task using the available artifacts?
  - If you can't complete the task using the available artifacts, query the list of available artifacts using the appropriate tool.
  - Identify which artifacts are relevant to the user's request.
  ${
    operationModel === 'planning'
      ? `
        - Break down the user's request into a step-by-step plan that you will use to execute the user's request, the plan items should include artifacts which will be used to perform the actions.
      `
      : `
      - Are the required artifacts already available?
      - If not, select which artifact(s) will be the most relevant and require them using the require_artifacts tool.
      - The require'd artifact tools will be available for use after require.
    `
  }

  Artifacts already required: ${availableArtifacts.join('\n')}
`;

export class AIServiecOverloadedError extends S.TaggedError<AIServiecOverloadedError>()(
  'AIServiecOverloadedError',
  {},
) {}
