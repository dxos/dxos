//
// Copyright 2024 DXOS.org
//

import { type Runnable, RunnablePassthrough } from '@langchain/core/runnables';
import get from 'lodash.get';

import { type ChainInput, ChainInputType, ChainPromptType, type MessageType, type ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { todo } from '@dxos/debug';
import { Filter } from '@dxos/echo-db';
import { type EchoReactiveObject, type JsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

import { createContext, type RequestContext } from './context';
import { parseMessage } from './parser';
import { type ResolverMap } from './resolvers';
import { ResponseBuilder } from './response';
import { createStatusNotifier } from './status';
import { type ChainResources } from '../../chain';
import { type ModelInvocationArgs, type ModelInvoker } from '../../chain/model-invoker';

export type SequenceOptions = {
  prompt?: ChainPromptType;
  command?: string;
  content?: string;
  noVectorStore?: boolean;
  noTrainingData?: boolean;
};

export type RequestProcessorProps = {
  space: Space;

  /**
   * When a thread is provided we show "Processing" status on it while a response is being generated.
   * In addition, `thread.context` can be used for extracting additional prompt inputs.
   */
  thread?: ThreadType;
  message: MessageType;

  /**
   * RequestProcessor first looks for an explicit prompt trigger at the beginning of a message:
   * `/say ...`
   * If a message doesn't start with an explicit prompt, the defaultPrompt will be used.
   */
  prompt?: ChainPromptType;
};

export type ProcessThreadResult = {
  success: boolean;
  text?: string;
  parts?: EchoReactiveObject<any>[];
};

export class RequestProcessor {
  constructor(
    private readonly _modelInvoker: ModelInvoker,
    private readonly _resources: ChainResources,
    private readonly _resolvers?: ResolverMap,
  ) {}

  // TODO(burdon): Generalize so that we can process outside of a thread.
  async processThread({ space, thread, message, prompt }: RequestProcessorProps): Promise<ProcessThreadResult> {
    const { start, stop } = this._createStatusNotifier(space, thread);
    try {
      // Match prompt, and include content over multiple lines.
      const match = message.text.match(/\/([\w-]+)\s*(.*)/s);
      const [command, content] = match ? match.slice(1) : [undefined, message.text];
      if (prompt || command) {
        start();
        const context = await createContext(space, message, thread);

        log.info('processing', { command, content, context });
        const modelArgs = await this._createModelArgs(space, context, { prompt, command, content });
        if (modelArgs) {
          const response = await this._modelInvoker.invoke(modelArgs);
          const result = parseMessage(response);

          const builder = new ResponseBuilder(space, context);
          const blocks = builder.build(result);
          const text =
            blocks
              ?.map(({ content }) => content)
              .filter(nonNullable)
              .join('\n') ?? '';
          const parts = blocks?.map(({ object }) => object).filter(nonNullable) ?? [];

          log.info('response', { blocks });
          return { success: true, text, parts };
        }
      }
    } catch (err) {
      // Process as error so that we don't keep processing.
      log.error('processing failed', err);
      return {
        success: false,
        text: 'Error generating response.',
      };
    } finally {
      stop();
    }

    return { success: true };
  }

  private async _createModelArgs(
    space: Space,
    context: RequestContext,
    options: SequenceOptions,
  ): Promise<ModelInvocationArgs | undefined> {
    log.info('create sequence', {
      context: {
        object: { space: space.key, id: context.object?.id, schema: context.object?.__typename },
      },
      options,
    });

    // Find prompt matching command.
    if (options.command) {
      const { objects: allPrompts = [] } = await space.db.query(Filter.schema(ChainPromptType)).run();
      for (const prompt of allPrompts) {
        if (prompt.command === options.command) {
          return await this._createModelArgsFromPrompt(space, prompt, context, options);
        }
      }
    }

    // Use the given prompt as a fallback.
    if (options.prompt) {
      return await this._createModelArgsFromPrompt(space, options.prompt, context, options);
    }

    return undefined;
  }

  /**
   * Create a runnable sequence from a stored prompt.
   */
  private async _createModelArgsFromPrompt(
    space: Space,
    prompt: ChainPromptType,
    context: RequestContext,
    options: SequenceOptions,
  ): Promise<ModelInvocationArgs> {
    const templateSubstitutions: Record<string, any> = {};
    if (prompt.inputs?.length) {
      for (const input of prompt.inputs) {
        templateSubstitutions[input.name] = await this.getTemplateInput(space, input, context);
      }
    }
    // TODO(burdon): Test using JSON schema.
    // TODO(burdon): OpenAI-specific kwargs.
    const withSchema = false;
    const customArgs: any = withSchema && {
      function_call: { name: 'output_formatter' },
      functions: [
        {
          name: 'output_formatter',
          description: 'Should always be used to properly format output.',
          parameters: Array.from(context.schema?.values() ?? []).reduce<{ [name: string]: JsonSchema }>(
            (map, schema) => {
              map[schema.typename] = {
                type: 'array',
                items: schema.serializedSchema.jsonSchema,
                description: `An array of ${schema.typename} entities.`,
              };
              return map;
            },
            {},
          ),
        },
      ],
    };

    return {
      space,
      sequenceInput: options.content ?? '',
      template: prompt.template,
      templateSubstitutions,
      modelArgs: customArgs,
      outputFormat: withSchema ? 'json' : 'text',
    } satisfies ModelInvocationArgs;
  }

  private async getTemplateInput(
    space: Space,
    { type, value }: ChainInput,
    context: RequestContext,
  ): Promise<Runnable | null | (() => string | null | undefined)> {
    switch (type) {
      //
      // Predefined value.
      //
      case ChainInputType.VALUE: {
        return () => value;
      }

      //
      // User message.
      //
      case ChainInputType.PASS_THROUGH: {
        return new RunnablePassthrough();
      }

      //
      // Embeddings vector store.
      //
      case ChainInputType.RETRIEVER: {
        return this._resources.createStringRetriever();
      }

      //
      // Retrieve external data.
      //
      case ChainInputType.RESOLVER: {
        const type = value;
        if (!type) {
          return null;
        }

        // TODO(burdon): Exec now?
        const result = await this.execResolver(type);
        return () => result;
      }

      //
      // Schema
      //
      case ChainInputType.SCHEMA: {
        const type = value;
        if (!type) {
          return null;
        }

        // TODO(dmaretskyi): Convert to the new dynamic schema API.
        const schemas = await space.db.schema.list();
        const schema = schemas.find((schema) => schema.typename === type);
        if (schema) {
          // TODO(burdon): Use effect schema to generate JSON schema.
          const name = schema.typename.split(/[.-/]/).pop();
          // TODO(burdon): Update.
          const fields = todo() as any[]; // schema.props.filter(({ type }) => type === Schema.PropType.STRING).map(({ id }) => id);
          return () => `${name}: ${fields.join(', ')}`;
        }

        break;
      }

      //
      // Current app context/state.
      //
      case ChainInputType.CONTEXT: {
        return () => {
          if (value) {
            const obj = get(context, value);
            // TODO(burdon): Hack in case returning a TextType object.
            if (obj?.content) {
              return obj.content;
            }

            return obj;
          }

          // TODO(burdon): Default?
          return context.text;
        };
      }

      default: {
        log.warn(`invalid input: ${type}`);
      }
    }

    return null;
  }

  // TODO(burdon): Remove (build into resolver abstraction).
  private async execResolver(name: string): Promise<string | undefined> {
    if (!this._resolvers) {
      return undefined;
    }

    try {
      const resolver = get(this._resolvers, name);
      if (!resolver) {
        return undefined;
      }

      log.info('running resolver', { resolver: name });
      const start = performance.now();
      const result = typeof resolver === 'function' ? await resolver() : resolver;
      log.info('resolver complete', { resolver: name, duration: performance.now() - start });
      return result;
    } catch (error) {
      log.error('resolver error', { resolver: name, error });
      return undefined;
    }
  }

  private _createStatusNotifier(space: Space, thread: ThreadType | undefined) {
    return thread ? createStatusNotifier(space, thread.id) : { start: () => {}, stop: () => {} };
  }
}
