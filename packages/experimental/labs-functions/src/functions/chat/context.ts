//
// Copyright 2024 DXOS.org
//

import {
  Document as DocumentType,
  type Message as MessageType,
  type Thread as ThreadType,
} from '@braneframe/types/proto';
import { type Space } from '@dxos/client/echo';
import { getTextInRange, Schema, toJsonSchema, type TypedObject } from '@dxos/echo-schema';

export type RequestContext = {
  object?: TypedObject;
  text?: string;
  schema?: Map<string, Schema>;
};

export const createContext = (space: Space, message: MessageType, thread: ThreadType): RequestContext => {
  let object: TypedObject | undefined;
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
  const { objects } = space.db.query(Schema.filter());
  const schema = objects.reduce<Map<string, Schema>>((map, schema) => {
    const jsonSchema = toJsonSchema(schema);
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
const getReferencedText = (document: DocumentType, comment: DocumentType.Comment): string => {
  if (!comment.cursor) {
    return '';
  }

  const [begin, end] = comment.cursor.split(':');
  return getTextInRange(document.content, begin, end);
};
