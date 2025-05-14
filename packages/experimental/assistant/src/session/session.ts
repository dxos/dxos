//
// Copyright 2025 DXOS.org
//

import { Option, Schema } from 'effect';

import {
  defineTool,
  Message,
  structuredOutputParser,
  ToolResult,
  type ArtifactDefinition,
  type MessageContentBlock,
  type Tool,
} from '@dxos/artifact';
import { Event, synchronized } from '@dxos/async';
import { ObjectVersion } from '@dxos/echo-db';
import { create, type ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { isToolUse, runTools } from './tools';
import { VersionPin } from './version-pin';
import { MixedStreamParser, type AIServiceClient, type GenerateRequest, type GenerationStream } from '../ai-service';

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

/**
 * Resolves artifact ids to their versions.
 * Used to give the model a sense of the changes to the artifacts made by users during the conversation.
 * The artifacts versions are pinned in the history, and whenever the artifact changes in-between assistant's steps,
 * a diff is inserted into the conversation.
 */
export type ArtifactDiffResolver = (artifacts: { id: ObjectId; lastVersion: ObjectVersion }[]) => Promise<
  Map<
    ObjectId,
    {
      version: ObjectVersion;
      diff?: string;
    }
  >
>;

export type SessionRunOptions = {
  client: AIServiceClient;

  artifacts: ArtifactDefinition[];

  /**
   * Non-artifact specific tools.
   */
  tools: Tool[];

  history: Message[];

  prompt: string;

  generationOptions?: Pick<GenerateRequest, 'model'>;

  extensions?: ToolContextExtensions;

  systemPrompt?: string;

  /**
   * Pre-require artifacts.
   */
  requiredArtifactIds?: string[];

  /**
   * @see ArtifactDiffResolver
   */
  artifactDiffResolver?: ArtifactDiffResolver;
};

type OperationModel = 'planning' | 'importing' | 'configured';

export type AiSessionOptions = {
  /**
   * Determines the agent's handling of the artifacts definitions:
   *
   * - `planning`: The model will create a plan with required artifacts for each step.
   * - `importing`: The model can query registry and only pull in the artifacts that are required to complete the task.
   * - `configured`: The available artifacts are pre-selected and the model cannot select additional artifacts.
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
    const systemTools: Tool[] = [];
    switch (this._options.operationModel) {
      case 'planning':
        systemTools.push(this._createQueryArtifactsTool(options.artifacts), this._createPlanningTool(options));
        break;
      case 'importing':
        systemTools.push(
          this._createQueryArtifactsTool(options.artifacts),
          this._createRequireTool(options.artifacts, (artifactDefinitionIds) => {
            for (const artifactDefinitionId of artifactDefinitionIds) {
              requiredArtifactIds.add(artifactDefinitionId);
            }
          }),
        );
        break;
      case 'configured':
        // no system tools
        break;
      default:
        throw new TypeError(`Invalid operation model: ${this._options.operationModel}`);
    }

    this._history = [...options.history];
    this._pending = [await this._formatUserPrompt(options.artifactDiffResolver, options.prompt, options.history)];
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
        this._stream = await options.client.execStream({
          ...(options.generationOptions ?? {}),
          // TODO(burdon): Rename messages or separate history/message.
          history: [...this._history, ...this._pending],
          tools,
          systemPrompt:
            options.systemPrompt ??
            createBaseInstructions({
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
        error = new AIServiecOverloadedError('AI service overloaded', { cause: err } as any); // TODO(dmaretskyi): Schema errors cant have cause
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

  async runStructured<S extends Schema.Schema.AnyNoContext>(schema: S, options: SessionRunOptions) {
    const parser = structuredOutputParser(schema);
    const result = await this.run({
      ...options,
      tools: [...options.tools, parser.tool],
    });
    return parser.getResult(result);
  }

  private async _formatUserPrompt(
    artifactDiffResolver: ArtifactDiffResolver | undefined,
    prompt: string,
    history: Message[],
  ) {
    const prelude: MessageContentBlock[] = [];

    if (artifactDiffResolver) {
      const versions = gatherObjectVersions(history);

      const artifactDiff = await artifactDiffResolver(
        Array.from(versions.entries()).map(([id, version]) => ({ id, lastVersion: version })),
      );

      log.info('vision', {
        artifactDiff,
        versions,
      });

      for (const [id, { version }] of [...artifactDiff.entries()]) {
        if (ObjectVersion.equals(version, versions.get(id)!)) {
          artifactDiff.delete(id);
          continue;
        }

        prelude.push(VersionPin.createBlock(VersionPin.make({ objectId: id, version })));
      }
      if (artifactDiff.size > 0) {
        prelude.push(createArtifactUpdateBlock(artifactDiff));
      }
    }

    return create(Message, {
      role: 'user',
      content: [...prelude, { type: 'text', text: prompt }],
    });
  }

  private _createQueryArtifactsTool(artifacts: ArtifactDefinition[]) {
    return defineTool('system', {
      name: 'query_artifact_definitions',
      description: 'Query the available artifact definitions',
      schema: Schema.Struct({}),
      execute: async () => {
        return ToolResult.Success({
          artifactDefinitions: artifacts.map((artifact) => ({
            id: artifact.id,
            name: artifact.name,
            description: artifact.description,
          })),
        });
      },
    });
  }

  private _createRequireTool(
    artifacts: ArtifactDefinition[],
    onRequire: (artifactDefinitionIds: readonly string[]) => void,
  ) {
    return defineTool('system', {
      name: 'require_artifact_definitions',
      description:
        'Require the use of specific artifact definitions. This will allow the model to interact with artifact definitions and use their tools.',
      schema: Schema.Struct({
        artifactDefinitionIds: Schema.Array(Schema.String).annotations({
          description: 'The ids of the artifact definitions to require',
          examples: [['artifact:dxos.org/example/Test']],
        }),
      }),
      execute: async ({ artifactDefinitionIds }) => {
        const missingArtifactDefinitionIds = artifactDefinitionIds.filter(
          (artifactId) => !artifacts.some((artifact) => artifact.id === artifactId),
        );
        if (missingArtifactDefinitionIds.length > 0) {
          return ToolResult.Error(
            `One or more artifact definition ids are invalid: ${missingArtifactDefinitionIds.join(', ')}`,
          );
        }

        onRequire(artifactDefinitionIds);

        return ToolResult.Success({});
      },
    });
  }

  private _createPlanningTool(options: SessionRunOptions) {
    return defineTool('system', {
      name: 'create_plan',
      description:
        'Create a plan. Make sure that each step is independent and can be executed solely on the data returned by the previous step. The steps only share the data that is specified in the plan.',
      schema: Schema.Struct({
        goal: Schema.String.annotations({ description: 'The goal that the plan will achieve.' }),
        steps: Schema.Array(
          Schema.Struct({
            action: Schema.String.annotations({
              description: 'Complete, detailed action to perform.',
            }),
            input: Schema.String.annotations({
              description: 'The required input data for this step. First step must not require any data.',
            }),
            output: Schema.String.annotations({
              description: 'The output data from this step. This is passed to the next step as input.',
            }),
            requiredArtifactIds: Schema.Array(Schema.String).annotations({
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
          log('executing step', { action: step.action });
          const session = new AISession({ operationModel: 'importing' });
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
            artifactDiffResolver: options.artifactDiffResolver,
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
    });
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
  
  
  ${
    operationModel === 'planning'
      ? `
      - Can you complete the task using the available artifacts?
      - If you can't complete the task using the available artifacts, query the list of available artifacts using the appropriate tool.
      - Identify which artifacts are relevant to the user's request.
        - Break down the user's request into a step-by-step plan that you will use to execute the user's request, the plan items should include artifacts which will be used to perform the actions.
      `
      : ''
  }
  ${
    operationModel === 'importing'
      ? `
      - Can you complete the task using the available artifacts?
      - If you can't complete the task using the available artifacts, query the list of available artifacts using the appropriate tool.
      - Identify which artifacts are relevant to the user's request.
    - Are the required artifacts already available?
    - If not, select which artifact(s) will be the most relevant and require them using the require_artifacts tool.
    - The require'd artifact tools will be available for use after require.
  `
      : ''
  }
  ${
    operationModel === 'configured'
      ? `
    - Select the most relevant artifact(s) to complete the task.
    - Call the appropriate tool to use the artifact(s).
  `
      : ''
  }

  ${availableArtifacts.length > 0 ? `Artifacts already in context: ${availableArtifacts.join('\n')}` : ''}
`;

export class AIServiecOverloadedError extends Schema.TaggedError<AIServiecOverloadedError>()(
  'AIServiecOverloadedError',
  {},
) {}

const gatherObjectVersions = (messages: Message[]): Map<ObjectId, ObjectVersion> => {
  const artifactIds = new Map<ObjectId, ObjectVersion>();
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === 'json' && block.disposition === VersionPin.DISPOSITION) {
        const pin = VersionPin.pipe(Schema.decodeOption)(JSON.parse(block.json)).pipe(Option.getOrUndefined);
        if (!pin) {
          continue;
        }
        artifactIds.set(pin.objectId, pin.version);
      }
    }
  }

  return artifactIds;
};

const createArtifactUpdateBlock = (
  artifactDiff: Map<ObjectId, { version: ObjectVersion; diff?: string }>,
): MessageContentBlock => {
  return {
    type: 'text',
    disposition: 'artifact-update',
    text: `
      The following artifacts have been updated since the last message:
      ${Array.from(artifactDiff.entries())
        .map(([id, { diff }]) => `<changed-artifact id="${id}">${diff ? `\n${diff}` : ''}</changed-artifact>`)
        .join('\n')}
    `,
  };
};
