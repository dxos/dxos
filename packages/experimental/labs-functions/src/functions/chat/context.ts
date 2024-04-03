//
// Copyright 2024 DXOS.org
//

import { type DocumentCommentType, DocumentType, type MessageType, type ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { type DynamicEchoSchema, type EchoReactiveObject, effectToJsonSchema, getTextInRange } from '@dxos/echo-schema';

export type RequestContext = {
  object?: EchoReactiveObject<any>;
  text?: string;
  schema?: Map<string, DynamicEchoSchema>;
};

export const createContext = (space: Space, message: MessageType, thread: ThreadType): RequestContext => {
  let object: EchoReactiveObject<any> | undefined;
  if (message.context?.object) {
    const { objects } = space.db.query({ id: message.context?.object });
    object = objects[0];
  } else if (thread.context?.object) {
    const { objects } = space.db.query({ id: thread.context?.object });
    object = objects[0];
  }

  let text: string | undefined;
  if (object instanceof DocumentType) {
    const comment = object.comments?.find((comment) => comment.thread === thread);
    if (comment) {
      text = getReferencedText(object, comment);
    }
  }

  // Create schema registry.
  // TODO(burdon): Filter?
  const schemaList = space.db.schemaRegistry.getAll();
  const schema = schemaList.reduce<Map<string, DynamicEchoSchema>>((map, schema) => {
    const jsonSchema = effectToJsonSchema(schema);
    if (jsonSchema.title) {
      map.set(jsonSchema.title, schema);
    }

    return map;
  }, new Map());

  return { object, text, schema };
};

/**
 * @deprecated Clean this up.
 * Text cursors should be a part of core ECHO API.
 */
const getReferencedText = (document: DocumentType, comment: DocumentCommentType): string => {
  if (!comment.cursor) {
    return '';
  }

  const [begin, end] = comment.cursor.split(':');
  return document.content ? getTextInRange(document.content, begin, end) : '';
};
