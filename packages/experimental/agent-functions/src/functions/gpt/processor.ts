//
// Copyright 2024 DXOS.org
//

import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { type Runnable, type RunnableLike, RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';
import get from 'lodash.get';

import {
  type BlockType,
  type ChainInput,
  ChainInputType,
  type ChainPromptType,
  ChainType,
  type MessageType,
  TextV0Type,
  type ThreadType,
} from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { todo } from '@dxos/debug';
import { Filter, loadObjectReferences } from '@dxos/echo-db';
import { create, type JsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createContext, type RequestContext } from './context';
import { parseMessage } from './parser';
import { type ResolverMap } from './resolvers';
import { ResponseBuilder } from './response';
import { createStatusNotifier } from './status';
import { type ChainResources } from '../../chain';

export type SequenceOptions = {
  prompt?: string;
  noVectorStore?: boolean;
  noTrainingData?: boolean;
};

export type ProcessThreadArgs = {
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
  defaultPrompt?: string;
};

export class RequestProcessor {
  constructor(
    private readonly _resources: ChainResources,
    private readonly _resolvers?: ResolverMap,
  ) {}

  async processThread({ space, thread, message, defaultPrompt }: ProcessThreadArgs): Promise<BlockType[] | undefined> {
    let blocks: BlockType[] | undefined;
    const { start, stop } = this._createStatusNotifier(space, thread);
    try {
      const text = message.blocks
        .map((block) => block.content?.content)
        .filter(Boolean)
        .join('\n');

      // Match prompt, and include content over multiple lines.
      const match = text.match(/\/([\w-]+)\s*(.*)/s);
      const [prompt, content] = match ? match.slice(1) : [defaultPrompt, text];
      if (prompt) {
        start();

        const context = await createContext(space, message, thread);

        log.info('processing', { prompt, content });
        const sequence = await this.createSequence(space, context, { prompt });
        if (sequence) {
          const response = await sequence.invoke(content);
          const result = parseMessage(response);

          const builder = new ResponseBuilder(space, context);
          blocks = builder.build(result);
          log.info('response', { blocks });
        }
      }
    } catch (err) {
      log.error('processing message', err);
      blocks = [
        {
          timestamp: new Date().toISOString(),
          content: create(TextV0Type, { content: 'Error generating response.' }),
        },
      ];
    } finally {
      stop();
    }

    return blocks;
  }

  async createSequence(
    space: Space,
    context: RequestContext,
    options: SequenceOptions,
  ): Promise<RunnableSequence | undefined> {
    log.info('create sequence', {
      context: {
        object: { id: context.object?.id, schema: context.object?.__typename },
      },
      options,
    });

    // Find suitable prompt.
    const { objects: chains = [] } = await space.db.query(Filter.schema(ChainType)).run();
    const allPrompts = (await loadObjectReferences(chains, (c) => c.prompts)).flatMap((p) => p);
    for (const prompt of allPrompts) {
      if (prompt.command === options.prompt) {
        return await this.createSequenceFromPrompt(space, prompt, context);
      }
    }

    return undefined;
  }

  /**
   * Create a runnable sequence from a stored prompt.
   */
  async createSequenceFromPrompt(
    space: Space,
    prompt: ChainPromptType,
    context: RequestContext,
  ): Promise<RunnableSequence> {
    const inputs: Record<string, any> = {};
    for (const input of await loadObjectReferences(prompt, (p) => p.inputs)) {
      inputs[input.name] = await this.getTemplateInput(space, input, context);
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

    // TODO(burdon): Factor out.
    const promptLogger: RunnableLike = (input) => {
      log.info('prompt', { prompt: input.value });
      return input;
    };

    const template = await loadObjectReferences(prompt, (p) => p.source);
    return RunnableSequence.from([
      inputs,
      PromptTemplate.fromTemplate(template),
      promptLogger,
      this._resources.model.bind(customArgs),
      withSchema ? new JsonOutputFunctionsParser() : new StringOutputParser(),
    ]);
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
        const retriever = this._resources.store.vectorStore.asRetriever({});
        return retriever.pipe(formatDocumentsAsString); // TODO(burdon): ???
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
        const schemas = await space.db.schemaRegistry.getAll();
        const schema = schemas.find((schema) => schema.typename === type);
        if (schema) {
          // TODO(burdon): Use effect schema to generate JSON schema.
          const name = schema.typename.split(/[.-/]/).pop();
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
            return value ? get(context, value) : undefined;
          }

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
