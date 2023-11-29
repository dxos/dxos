//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { Document as DocumentType, File as FileType } from '@braneframe/types';
import { type TypedObject } from '@dxos/echo-schema';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ChainDocument, createOpenAIChainResources } from '../../chain';
import { getKey, isTypedObject, nonNullable } from '../../util';

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({
  event,
  context: { client, dataDir },
  response,
}) => {
  invariant(dataDir);

  const docs: ChainDocument[] = [];
  const addDocuments =
    (space: PublicKey | undefined = undefined) =>
    (objects: TypedObject[]) => {
      for (const object of objects) {
        let text: string | undefined;
        switch (object.__typename) {
          case DocumentType.schema.typename: {
            text = object.content?.text.trim();
            break;
          }

          case FileType.schema.typename: {
            break;
          }
        }

        if (text?.length) {
          docs.push({
            metadata: {
              space: space?.toHex(),
              id: object.id,
            },
            pageContent: text,
          });
        }
      }
    };

  const spaces = client.spaces.get();
  if (event.space) {
    const space = client.spaces.get(PublicKey.from(event.space))!;
    if (space) {
      if (event.objects?.length) {
        // TODO(burdon): Update API to make this simpler.
        const objects = event.objects
          ?.map<TypedObject | undefined>((id) => space.db.getObjectById(id))
          .filter(nonNullable)
          .filter(isTypedObject);

        addDocuments(space.key)(objects);
      } else {
        const { objects: documents } = space.db.query(DocumentType.filter());
        addDocuments(space.key)(documents);
        const { objects: files } = space.db.query(FileType.filter());
        addDocuments(space.key)(files);
      }
    }
  } else {
    for (const space of spaces) {
      const { objects: documents } = space.db.query(DocumentType.filter());
      addDocuments(space.key)(documents);
      const { objects: files } = space.db.query(FileType.filter());
      addDocuments(space.key)(files);
    }
  }

  if (docs.length) {
    // TODO(burdon): Configure model variant based on env.
    const config = client.config;
    const resources = createOpenAIChainResources({
      baseDir: dataDir ? join(dataDir, 'agent/functions/embedding') : undefined,
      apiKey: getKey(config, 'openai.com/api_key'),
    });

    await resources.store.initialize();

    // TODO(burdon): Remove deleted docs.
    await resources.store.addDocuments(docs);
    await resources.store.save();

    log.info('embedding', resources.info);
  }

  return response.status(200);
};
