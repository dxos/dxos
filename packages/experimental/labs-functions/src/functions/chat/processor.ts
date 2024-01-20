//
// Copyright 2024 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { formatDocumentsAsString } from 'langchain/util/document';
import get from 'lodash.get';

import { Chain as ChainType, type Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextContent } from '@dxos/echo-schema';
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
  constructor(private readonly _resources: ChainResources, private readonly _resolvers: ResolverMap) {}

  async processThread(
    space: Space,
    thread: ThreadType,
    message: MessageType,
  ): Promise<MessageType.Block[] | undefined> {
    let blocks: MessageType.Block[] | undefined;
    const { start, stop } = createStatusNotifier(space, thread.id);
    try {
      const text = message.blocks
        .map((message) => message.text)
        .filter(Boolean)
        .join('\n');

      const match = text.match(/\/(\w+)\s*(.+)?/);
      if (match) {
        const prompt = match[1];
        const content = match[2];

        start();
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
      blocks = [{ text: 'Error generating response.' }];
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
        schema: context.schema?.typename,
      },
      options,
    });

    // Find suitable prompt.
    const { objects: chains = [] } = space.db.query(ChainType.filter());
    for (const chain of chains) {
      for (const prompt of chain.prompts) {
        if (prompt.command === options.prompt) {
          return await this.createSequenceFromPrompt(prompt, context);
        }
      }
    }

    return undefined;
  }

  async createSequenceFromPrompt(prompt: ChainType.Prompt, context: RequestContext): Promise<RunnableSequence> {
    const inputs: Record<string, any> = {};

    for (const { type, name, value } of prompt.inputs) {
      switch (type) {
        case ChainType.Input.Type.VALUE: {
          inputs[name] = () => getTextContent(value);
          break;
        }

        case ChainType.Input.Type.PASS_THROUGH: {
          inputs[name] = new RunnablePassthrough();
          break;
        }

        case ChainType.Input.Type.CONTEXT: {
          inputs[name] = () => {
            if (value) {
              const text = getTextContent(value);
              if (text.length) {
                try {
                  const result = get(context, text);

                  // TODO(burdon): Special case for getting schema fields for list preset.
                  // TODO(burdon): Proxied arrays don't pass Array.isArray.
                  // if (Array.isArray(result)) {
                  if (typeof result !== 'string' && result?.length) {
                    return result
                      .slice(0, 3)
                      .map((prop: any) => prop?.id)
                      .join(',');
                  }

                  return result;
                } catch (err) {
                  // TODO(burdon): Return error to user.
                }
              }
            }

            return context.text;
          };
          break;
        }

        case ChainType.Input.Type.RETRIEVER: {
          const retriever = this._resources.store.vectorStore.asRetriever({});
          inputs[name] = retriever.pipe(formatDocumentsAsString);
          break;
        }

        case ChainType.Input.Type.RESOLVER: {
          const result = await this.execResolver(getTextContent(value));
          inputs[name] = () => result;
          break;
        }
      }
    }

    return RunnableSequence.from([
      inputs,
      PromptTemplate.fromTemplate(getTextContent(prompt.source)),
      this._resources.chat,
      new StringOutputParser(),
    ]);
  }

  // TODO(burdon): Remove (build into resolver abstraction).
  private async execResolver(name: string) {
    try {
      const resolver = get(this._resolvers, name);
      if (!resolver) {
        return '';
      }

      log.info('running resolver', { resolver: name });
      const start = performance.now();
      const result = typeof resolver === 'function' ? await resolver() : resolver;
      log.info('resolver complete', { resolver: name, duration: performance.now() - start });
      return result;
    } catch (error) {
      log.error('resolver error', { resolver: name, error });
      return '';
    }
  }
}
