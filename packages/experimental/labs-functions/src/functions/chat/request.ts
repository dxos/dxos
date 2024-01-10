//
// Copyright 2023 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { formatDocumentsAsString } from 'langchain/util/document';

import { Chain as ChainType } from '@braneframe/types';
import { type Message as MessageType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextContent, Schema, type TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { sequences } from './chains';
import type { ChainResources } from '../../chain';
import { Resolvers } from './resolvers';
import get from 'lodash.get';

export type PromptContext = {
  object?: TypedObject;
  schema?: Schema;
};

export const createContext = (space: Space, messageContext: MessageType.Context | undefined): PromptContext => {
  let object: TypedObject | undefined;
  if (messageContext?.object) {
    const { objects } = space.db.query({ id: messageContext?.object });
    object = objects[0];
  }

  // TODO(burdon): How to infer schema from message/context/prompt.
  let schema: Schema | undefined;
  if (object?.__typename === 'braneframe.Grid') {
    const { objects: schemas } = space.db.query(Schema.filter());
    schema = schemas.find((schema) => schema.typename === 'example.com/schema/project');
  }

  return {
    object,
    schema,
  };
};

export type SequenceTest = (context: PromptContext) => boolean;

type SequenceOptions = {
  command?: string;
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
  if (options.command) {
    const { objects: chains = [] } = space.db.query(ChainType.filter());
    for (const chain of chains) {
      for (const prompt of chain.prompts) {
        if (prompt.command === options.command) {
          return createSequenceFromPrompt(resources, prompt, resolvers);
        }
      }
    }
  }

  // TODO(burdon): Return meta -- e.g., ID.
  // Create sequence from predicates.
  const { id, generator } = sequences.find(({ test }) => test(context))!;
  log.info('sequence', { id });
  return generator(resources, () => context, options);
};

const createSequenceFromPrompt = async (resources: ChainResources, prompt: ChainType.Prompt, resolvers: Resolvers) => {
  const inputs: Record<string, any> = {}
  for(const { type, name, value } of prompt.inputs) {
    switch (type) {
      case ChainType.Input.Type.VALUE: {
        inputs[name] = () => getTextContent(value);
        break;
      }
      case ChainType.Input.Type.PASS_THROUGH: {
        inputs[name] = new RunnablePassthrough();
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
    const resolver = get(resolvers, name )
    log.info('running resolver', { resolver: name  })
    const start = performance.now();
    const result =  typeof resolver === 'function' ? await resolver() : resolver;
    log.info('resolver complete', { resolver: name , duration: performance.now() - start })
    return result;
  } catch (error) {
    log.error('resolver error', { resolver: name, error })
    return '';
  }
}