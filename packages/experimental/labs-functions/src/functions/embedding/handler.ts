//
// Copyright 2023 DXOS.org
//

import { Document as DocumentType } from '@braneframe/types';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { getKey } from '../../util';
import { type ChainDocument, ChainResources } from '../chat';

// TODO(burdon): Query update isn't fired when documents are edited.
export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({ event, context, response }) => {
  const docs: ChainDocument[] = [];
  const addDocument =
    (space: PublicKey | undefined = undefined) =>
    (object: DocumentType) =>
      object.content.text.trim().length > 0 &&
      docs.push({
        metadata: { space: space?.toHex(), id: object.id },
        pageContent: object.content.text,
      });

  const spaces = context.client.spaces.get();
  if (event.space && event.objects.length > 0) {
    const space = context.client.spaces.get(PublicKey.from(event.space))!;
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
    const config = context.client.config;
    const resources = new ChainResources({
      apiKey: getKey(config, 'openai.com/api_key')!,
      // TODO(burdon): Get from context (for agent profile).
      baseDir: '/tmp/dxos/agent/functions/embedding',
    });

    await resources.initialize();

    // TODO(burdon): Remove deleted docs.
    await resources.addDocuments(docs);
    await resources.save();

    log.info('embedding', { resources: resources.stats });
  }

  return response.status(200);
};
