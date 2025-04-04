//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { type ReactiveEchoObject, createDocAccessor, getTextInRange, loadObjectReferences } from '@dxos/echo-db';
import { isInstanceOf } from '@dxos/echo-schema';
import { type EchoSchema, toJsonSchema } from '@dxos/echo-schema';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { type MessageType, type ThreadType } from '@dxos/plugin-space/types';

// TODO(burdon): Evolve.
export type RequestContext = {
  schema?: Map<string, EchoSchema>;
  object?: ReactiveEchoObject<any>;
  text?: string;
};

export const createContext = async (
  space: Space,
  message: MessageType,
  thread: ThreadType | undefined,
): Promise<RequestContext> => {
  let object: ReactiveEchoObject<any> | undefined;

  const contextObjectId = message.context?.target?.id;
  if (contextObjectId) {
    // TODO(burdon): Handle composite key?
    const idParts = contextObjectId.split(':');
    object = await space.db.query({ id: idParts[idParts.length - 1] }).first();
  } else {
    object = message;
  }

  // Get text from comment.
  let text: string | undefined;
  if (isInstanceOf(DocumentType, object)) {
    await loadObjectReferences(object, (doc) => doc.threads ?? []);
    const comment = object.threads?.find((t) => t.target === thread);
    if (object.content && comment?.target?.anchor) {
      const [start, end] = comment.target.anchor.split(':');
      text = getTextInRange(createDocAccessor(object.content.target!, ['content']), start, end) ?? '';
    }
  }

  // Create schema registry.
  // TODO(burdon): Filter?
  const schemaList = await space.db.schemaRegistry.query().run();
  const schema = schemaList.reduce<Map<string, EchoSchema>>((map, schema) => {
    const jsonSchema = toJsonSchema(schema);
    if (jsonSchema.title) {
      map.set(jsonSchema.title, schema);
    }

    return map;
  }, new Map());

  return { object, text, schema };
};
