//
// Copyright 2024 DXOS.org
//

import { Document as DocumentType, type Message as MessageType, type Thread as ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextInRange, Schema, type TypedObject } from '@dxos/echo-schema';

export type RequestContext = {
  object?: TypedObject;
  schema?: Schema;
  text?: string;
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

  // TODO(burdon): How to infer schema from message/context/prompt.
  const { objects: schemas } = space.db.query(Schema.filter());
  const schema = schemas.find((schema) => schema.typename === 'example.com/schema/project');

  if (object instanceof DocumentType) {
    const comment = object.comments?.find((comment) => comment.thread === thread);
    if (comment) {
      text = getReferencedText(object, comment);
    }
  }

  return { object, schema, text };
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
