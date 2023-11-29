//
// Copyright 2023 DXOS.org
//

import { type ChatMessage } from 'langchain/schema';

import { type Message as MessageType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { Schema, type TypedObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createPrompt } from './prompts';

export const createRequest = (space: Space, message: MessageType): ChatMessage[] => {
  const text = message.blocks
    .map((message) => message.text)
    .filter(Boolean)
    .join('\n');

  let context: TypedObject | undefined;
  if (message?.context.object) {
    const { objects } = space.db.query({ id: message.context.object });
    context = objects[0];
  }

  // TODO(burdon): How to infer schema from message/context/prompt.
  let schema: Schema | undefined;
  if (context?.__typename === 'braneframe.Grid') {
    const { objects: schemas } = space.db.query(Schema.filter());
    schema = schemas.find((schema) => schema.typename === 'example.com/schema/project');
    log.info('schemas', { schema: schema?.typename });
  }

  return createPrompt({ message: text, context, schema })!;
};
