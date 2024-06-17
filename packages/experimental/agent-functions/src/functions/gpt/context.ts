//
// Copyright 2024 DXOS.org
//

import { DocumentType, type MessageType, type ThreadType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { createDocAccessor, getTextInRange, loadObjectReferences } from '@dxos/echo-db';
import { type DynamicSchema, type EchoReactiveObject, effectToJsonSchema } from '@dxos/echo-schema';

// TODO(burdon): Evolve.
export type RequestContext = {
  schema?: Map<string, DynamicSchema>;
  object?: EchoReactiveObject<any>;
  text?: string;
};

export const createContext = async (
  space: Space,
  message: MessageType,
  thread: ThreadType | undefined,
): Promise<RequestContext> => {
  let object: EchoReactiveObject<any> | undefined;

  // TODO(burdon): ???
  const contextObjectId = message.context?.id;
  if (contextObjectId) {
    // TODO(burdon): Handle composite key?
    const idParts = contextObjectId.split(':');
    object = await space.db.loadObjectById(idParts[idParts.length - 1]);
  } else {
    object = message;
  }

  // Get text from comment.
  let text: string | undefined;
  if (object instanceof DocumentType) {
    await loadObjectReferences(object, (doc) => doc.threads ?? []);
    const comment = object.threads?.find((t) => t === thread);
    if (comment) {
      text = getReferencedText(object, comment);
    }
  }

  // Create schema registry.
  // TODO(burdon): Filter?
  const schemaList = await space.db.schema.list();
  const schema = schemaList.reduce<Map<string, DynamicSchema>>((map, schema) => {
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
const getReferencedText = (document: DocumentType, thread: ThreadType): string => {
  if (!thread.anchor) {
    return '';
  }

  const [start, end] = thread.anchor.split(':');
  return document.content ? getTextInRange(createDocAccessor(document.content, ['content']), start, end) : '';
};
