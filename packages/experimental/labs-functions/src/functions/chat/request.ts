//
// Copyright 2023 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { formatDocumentsAsString } from 'langchain/util/document';
import get from 'lodash.get';

import { Chain as ChainType, Document, type Thread, type Message as MessageType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextContent, getTextInRange, Schema, type TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { sequences } from './chains';
import { type Resolvers } from './resolvers';
import type { ChainResources } from '../../chain';

export type PromptContext = {
  object?: TypedObject;
  schema?: Schema;
  text?: string;
};

export const createContext = (space: Space, message: MessageType, thread: Thread): PromptContext => {
  let object: TypedObject | undefined;
  if (message.context?.object) {
    const { objects } = space.db.query({ id: message.context?.object });
    object = objects[0];
  } else if (thread.context?.object) {
    const { objects } = space.db.query({ id: thread.context?.object });
    object = objects[0];
  }

  // log.info('context', { message: message.context, thread: thread.context })

  let text: string | undefined;

  // TODO(burdon): How to infer schema from message/context/prompt.
  const { objects: schemas } = space.db.query(Schema.filter());
  const schema = schemas.find((schema) => schema.typename === 'example.com/schema/project');

  log.info('context object', { object });
  if (object instanceof Document) {
    const comment = object.comments?.find((comment) => comment.thread === thread);
    log.info('context comment', { object });
    if (comment) {
      text = getReferencedText(object, comment);
      log.info('context text', { text });
    }
  }

  return {
    object,
    schema,
    text,
  };
};

export type SequenceTest = (context: PromptContext) => boolean;

export type SequenceOptions = {
  prompt?: string;
  noVectorStore?: boolean;
  noTrainingData?: boolean;
};

export type SequenceGenerator = (
  resources: ChainResources,
  getContext: () => PromptContext,
  options?: SequenceOptions,
) => RunnableSequence;

// TODO(burdon): Create registry class.
export const createSequence = async (
  space: Space,
  resources: ChainResources,
  context: PromptContext,
  resolvers: Resolvers,
  options: SequenceOptions = {},
): Promise<RunnableSequence> => {
  log.info('create sequence', {
    context: {
      object: { id: context.object?.id, schema: context.object?.__typename },
      schema: context.schema?.typename,
    },
    options,
  });

  // Create sequence from command.
  if (options.prompt) {
    const { objects: chains = [] } = space.db.query(ChainType.filter());
    for (const chain of chains) {
      for (const prompt of chain.prompts) {
        if (prompt.command === options.prompt) {
          return createSequenceFromPrompt(resources, prompt, resolvers, context);
        }
      }
    }
  }

  // Create sequence from predicates.
  // TODO(burdon): Remove static sequences.
  const { id, generator } = sequences.find(({ test }) => test(context))!;
  log.info('sequence', { id });
  return generator(resources, () => context, options);
};

const createSequenceFromPrompt = async (
  resources: ChainResources,
  prompt: ChainType.Prompt,
  resolvers: Resolvers,
  context: PromptContext,
) => {
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
                if (result?.length) {
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
        const retriever = resources.store.vectorStore.asRetriever({});
        inputs[name] = retriever.pipe(formatDocumentsAsString);
        break;
      }

      case ChainType.Input.Type.RESOLVER: {
        const result = await runResolver(resolvers, getTextContent(value));
        inputs[name] = () => result;
        break;
      }
    }
  }

  return RunnableSequence.from([
    inputs,
    PromptTemplate.fromTemplate(getTextContent(prompt.source)),
    resources.chat,
    new StringOutputParser(),
  ]);
};

const runResolver = async (resolvers: Resolvers, name: string) => {
  try {
    const resolver = get(resolvers, name);
    log.info('running resolver', { resolver: name });
    const start = performance.now();
    const result = typeof resolver === 'function' ? await resolver() : resolver;
    log.info('resolver complete', { resolver: name, duration: performance.now() - start });
    return result;
  } catch (error) {
    log.error('resolver error', { resolver: name, error });
    return '';
  }
};

/**
 * @deprecated Clean this up. Only works for automerge.
 * Text cursors should be a part of core ECHO API.
 */
const getReferencedText = (document: Document, comment: Document.Comment): string => {
  if (!comment.cursor) {
    return '';
  }

  const [begin, end] = comment.cursor.split(':');
  return getTextInRange(document.content, begin, end);
};
