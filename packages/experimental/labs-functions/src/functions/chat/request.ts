//
// Copyright 2023 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';

import { Chain as ChainType } from '@braneframe/types';
import { type Message as MessageType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { Schema, type TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { sequences } from './chains';
import type { ChainResources } from '../../chain';

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
export const createSequence = (
  space: Space,
  resources: ChainResources,
  context: PromptContext,
  options: SequenceOptions = {},
): RunnableSequence => {
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
          return createSequenceFromPrompt(resources, prompt);
        }
      }
    }
  }

  // Create sequence from predicates.
  const { generator } = sequences.find(({ test }) => test(context))!;
  return generator(resources, () => context, options);
};

const createSequenceFromPrompt = (resources: ChainResources, prompt: ChainType.Prompt) => {
  const inputs = prompt.inputs.reduce<{ [name: string]: any }>((inputs, { type, name, value }) => {
    switch (type) {
      case ChainType.Input.Type.VALUE:
        inputs[name] = () => value.text;
        break;
      case ChainType.Input.Type.PASS_THROUGH:
        inputs[name] = new RunnablePassthrough();
        break;
    }

    return inputs;
  }, {});

  console.log('##', prompt.source.text);
  console.log('##', inputs);
  return RunnableSequence.from([
    inputs,
    PromptTemplate.fromTemplate(prompt.source.text),
    resources.chat,
    new StringOutputParser(),
  ]);
};
