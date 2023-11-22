//
// Copyright 2023 DXOS.org
//

import { type Document } from 'langchain/document';

import { Document as DocumentType } from '@braneframe/types';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';

import { getKey } from '../../util';
import { ChainResources } from '../chat';

// TODO(burdon): Debounce query subscriptions.
export const handler: FunctionHandler<FunctionSubscriptionEvent> = async ({ event, context, response }) => {
  const docs: Document[] = [];
  const addDocument =
    (space: PublicKey | undefined = undefined) =>
    (object: DocumentType) =>
      docs.push({
        metadata: { space: space?.toHex(), id: object.id },
        pageContent: object.content.text,
      });

  const spaces = context.client.spaces.get();
  if (event.space && event.objects.length === 0) {
    const space = context.client.spaces.get(PublicKey.from(event.space));
    if (space) {
      // TODO(burdon): Filter by id.
      const { objects } = space.db.query(DocumentType.filter());
      objects.forEach(addDocument(space.key));
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
      chat: { modelName: 'gpt-4' },
      // TODO(burdon): Get from context (for agent profile).
      baseDir: '/tmp/dxos/agent/functions/embedding',
    });

    await resources.initialize();

    // TODO(burdon): Remove previous.
    await resources.vectorStore.addDocuments(docs);
    console.log('###', resources.stats);
  }

  return response.status(200);
};
