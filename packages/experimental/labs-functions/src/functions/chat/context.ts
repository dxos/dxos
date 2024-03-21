//
// Copyright 2024 DXOS.org
//

import { Document as DocumentType, type Thread as ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextInRange, Schema, toJsonSchema, type TypedObject } from '@dxos/echo-schema';

export type RequestContext = {
  object?: TypedObject;
  text?: string;
  schema?: Map<string, Schema>;
};

export const createContext = (
  space: Space,
  thread: ThreadType,
  contextObjectId: string | undefined,
): RequestContext => {
  const object = contextObjectId ? space.db.query({ id: contextObjectId }).objects[0] : undefined;

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
