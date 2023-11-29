//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { Document as DocumentType } from '@braneframe/types';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ChainDocument, createOpenAIChainResources } from '../../chain';
import { getKey, isType, nonNullable } from '../../util';

export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({
  event,
  context: { client, dataDir },
  response,
}) => {
  invariant(dataDir);

  const docs: ChainDocument[] = [];
  const addDocument =
    (space: PublicKey | undefined = undefined) =>
    (object: DocumentType) =>
      object.content.text.trim().length > 0 &&
      docs.push({
        metadata: { space: space?.toHex(), id: object.id },
        pageContent: object.content.text,
      });

  const spaces = client.spaces.get();
  if (event.space) {
    const space = client.spaces.get(PublicKey.from(event.space))!;
    if (space) {
      // TODO(burdon): Update API to make this simpler.
      const objects = event.objects
        ?.map<DocumentType | undefined>((id) => space.db.getObjectById(id))
        .filter(nonNullable)
        .filter(isType(DocumentType.schema));

      if (!event?.objects.length) {
        const { objects: documents } = space.db.query(DocumentType.filter());
        objects.push(...documents);
      }

      objects.forEach(addDocument(space.key));
    }
  } else {
    for (const space of spaces) {
      const { objects } = space.db.query(DocumentType.filter());
      objects.forEach(addDocument(space.key));
    }
  }

  if (docs.length) {
    // TODO(burdon): Configure model variant based on env.
    const config = client.config;
    const resources = createOpenAIChainResources({
      baseDir: join(dataDir, 'agent/functions/embedding'),
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
