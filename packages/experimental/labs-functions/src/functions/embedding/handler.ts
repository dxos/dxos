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
import { getKey } from '../../util';

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
  if (event.space && event.objects.length > 0) {
    const space = client.spaces.get(PublicKey.from(event.space))!;
    const add = addDocument(space.key);
    if (space) {
      event.objects.forEach((id) => add(space.db.getObjectById(id)!));
    }
  } else {
    for (const space of spaces) {
      const { objects } = space.db.query(DocumentType.filter());
      objects.forEach(addDocument(space.key));
    }
  }

  if (docs.length) {
    const config = client.config;
    const { store } = createOpenAIChainResources({
      baseDir: join(dataDir, 'agent/functions/embedding'),
      apiKey: getKey(config, 'openai.com/api_key')!,
    });

    await store.initialize();

    // TODO(burdon): Remove deleted docs.
    await store.addDocuments(docs);
    await store.save();

    log.info('embedding', { resources: store.stats });
  }

  return response.status(200);
};
