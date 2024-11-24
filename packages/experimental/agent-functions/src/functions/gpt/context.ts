//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { type ReactiveEchoObject, createDocAccessor, getTextInRange, loadObjectReferences } from '@dxos/echo-db';
import { type MutableSchema, toJsonSchema } from '@dxos/echo-schema';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { type MessageType, type ThreadType } from '@dxos/plugin-space/types';

// TODO(burdon): Evolve.
export type RequestContext = {
  schema?: Map<string, MutableSchema>;
  object?: ReactiveEchoObject<any>;
  text?: string;
};

export const createContext = async (
  space: Space,
  message: MessageType,
  thread: ThreadType | undefined,
): Promise<RequestContext> => {
  let object: ReactiveEchoObject<any> | undefined;

  const contextObjectId = message.context?.id;
  if (contextObjectId) {
    // TODO(burdon): Handle composite key?
    const idParts = contextObjectId.split(':');
    object = await space.db.query({ id: idParts[idParts.length - 1] }).first();
  } else {
    object = message;
  }

  // Get text from comment.
  let text: string | undefined;
  if (object instanceof DocumentType) {
    await loadObjectReferences(object, (doc) => doc.threads ?? []);
    const comment = object.threads?.find((t) => t === thread);
    if (object.content && comment?.anchor) {
      const [start, end] = comment.anchor.split(':');
      text = getTextInRange(createDocAccessor(object.content, ['content']), start, end) ?? '';
    }
  }

  // Create schema registry.
  // TODO(burdon): Filter?
  const schemaList = await space.db.schemaRegistry.query();
  const schema = schemaList.reduce<Map<string, MutableSchema>>((map, schema) => {
    const jsonSchema = toJsonSchema(schema);
    if (jsonSchema.title) {
      map.set(jsonSchema.title, schema);
    }

    return map;
  }, new Map());

  return { object, text, schema };
};
