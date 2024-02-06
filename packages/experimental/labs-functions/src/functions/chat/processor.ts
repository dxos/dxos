//
// Copyright 2024 DXOS.org
//

import { type RunnableLike } from '@langchain/core/dist/runnables/base';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { type Runnable, RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';
import get from 'lodash.get';

import { Chain as ChainType, type Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextContent, Schema, TextObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createContext, type RequestContext } from './context';
import { parseMessage } from './parser';
import type { ResolverMap } from './resolvers';
import { ResponseBuilder } from './response';
import { createStatusNotifier } from './status';
import type { ChainResources } from '../../chain';

/**
 * @deprecated
 */
export type SequenceGenerator = (
  resources: ChainResources,
  getContext: () => RequestContext,
  options?: SequenceOptions,
) => RunnableSequence;

/**
 * @deprecated
 */
export type SequenceTest = (context: RequestContext) => boolean;

export type SequenceOptions = {
  prompt?: string;
  noVectorStore?: boolean;
  noTrainingData?: boolean;
};

export class RequestProcessor {
  constructor(
    private readonly _resources: ChainResources,
    private readonly _resolvers?: ResolverMap,
  ) {}

  async processThread(
    space: Space,
    thread: ThreadType,
    message: MessageType,
  ): Promise<MessageType.Block[] | undefined> {
    let blocks: MessageType.Block[] | undefined;
    const { start, stop } = createStatusNotifier(space, thread.id);
    try {
      const text = message.blocks
        .map((block) => getTextContent(block.content))
        .filter(Boolean)
        .join('\n');

      // Match prompt, and include content over multiple lines.
      const match = text.match(/\/(\w+)\s*(.+)/s);
      if (match) {
        start();

        const prompt = match[1];
        const content = match[2];
        const context = createContext(space, message, thread);

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
      blocks = [{ content: new TextObject('Error generating response.') }];
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
    const { objects: chains = [] } = space.db.query(ChainType.filter());
    for (const chain of chains) {
      for (const prompt of chain.prompts) {
        if (prompt.command === options.prompt) {
          return await this.createSequenceFromPrompt(space, prompt, context);
        }
      }
    }

    return undefined;
  }

  /**
   * Create a runnable sequence from a stored prompt.
   */
  async createSequenceFromPrompt(
    space: Space,
    prompt: ChainType.Prompt,
    context: RequestContext,
  ): Promise<RunnableSequence> {
    const inputs: Record<string, any> = {};
    for (const input of prompt.inputs) {
      inputs[input.name] = await this.getInput(space, input, context);
    }

    // TODO(burdon): OpenAI-specific kwargs.
    const withSchema = false;
    const customArgs: any = withSchema && {
      function_call: { name: 'output_formatter' },
      functions: [
        {
          name: 'output_formatter',
          description: 'Should always be used to properly format output.',
          parameters: context.schema,
        },
      ],
    };

    // TODO(burdon): Factor out.
    const promptLogger: RunnableLike = (input) => {
      log.info('prompt', { prompt: input.value });
      return input;
    };

    return RunnableSequence.from([
      inputs,
      PromptTemplate.fromTemplate(getTextContent(prompt.source)!),
      promptLogger,
      this._resources.model.bind(customArgs),
      withSchema ? new JsonOutputFunctionsParser() : new StringOutputParser(),
    ]);
  }

  private async getInput(
    space: Space,
    { type, value }: ChainType.Input,
    context: RequestContext,
  ): Promise<Runnable | null | (() => string | null | undefined)> {
    switch (type) {
      //
      // Predefined value.
      //
      case ChainType.Input.Type.VALUE: {
        return () => getTextContent(value);
      }

      //
      // User message.
      //
      case ChainType.Input.Type.PASS_THROUGH: {
        return new RunnablePassthrough();
      }

      //
      // Embeddings vector store.
      //
      case ChainType.Input.Type.RETRIEVER: {
        const retriever = this._resources.store.vectorStore.asRetriever({});
        return retriever.pipe(formatDocumentsAsString); // TODO(burdon): ???
      }

      //
      // Retrieve external data.
      //
      case ChainType.Input.Type.RESOLVER: {
        const type = getTextContent(value);
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
      case ChainType.Input.Type.SCHEMA: {
        const type = getTextContent(value);
        if (!type) {
          return null;
        }

        const { objects: schemas } = space.db.query(Schema.filter());
        const schema = schemas.find((schema) => schema.typename === type);
        if (schema) {
          // TODO(burdon): Use annotations.
          const name = schema.typename.split(/[.-/]/).pop();
          const fields = schema.props.filter(({ type }) => type === Schema.PropType.STRING).map(({ id }) => id);
          return () => `${name}: ${fields.join(', ')}`;
        }

        break;
      }

      //
      // Current app context/state.
      //
      case ChainType.Input.Type.CONTEXT: {
        return () => {
          if (value) {
            const text = getTextContent(value);
            return text ? get(context, text) : undefined;
          }

          return context.text;
        };
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
}
