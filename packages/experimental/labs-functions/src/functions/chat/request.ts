//
// Copyright 2023 DXOS.org
//

import { type RunnableSequence } from 'langchain/schema/runnable';

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
  noStore?: boolean;
  storeOnly?: boolean; // Store only.
};

export type SequenceGenerator = (
  resources: ChainResources,
  getContext: () => PromptContext,
  options?: SequenceOptions,
) => RunnableSequence;

// TODO(burdon): Create registry class.
export const createSequence = (
  resources: ChainResources,
  context: PromptContext,
  options: SequenceOptions = {},
): RunnableSequence => {
  log.info('create sequence', {
    context: {
      object: { id: context.object?.id, schema: context.object?.__typename },
      schema: context.schema?.typename,
    },
  });

  const { generator } = sequences.find(({ test }) => test(context))!;
  return generator(resources, () => context, options);
};
