//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';
import { promisify } from 'node:util';
import textract from 'textract';

import { Document as DocumentType, File as FileType } from '@braneframe/types/proto';
import { getTextContent, hasType, type TypedObject } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ChainDocument, type ChainVariant, createChainResources } from '../../chain';
import { getKey } from '../../util';

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { client, dataDir } = context;
  const { space, objects } = event;
  // TODO(burdon): Option to process all spaces.
  // if (!space || !objects?.length) {
  //   return response.status(400);
  // }

  invariant(dataDir);
  const docs: ChainDocument[] = [];
  const addDocuments =
    (space: PublicKey | undefined = undefined) =>
    async (objects: TypedObject[]) => {
      for (const object of objects) {
        let pageContent: string | undefined;
        log.info('processing', { object: { id: object.id, type: object.__typename } });
        switch (object.__typename) {
          case DocumentType.schema.typename: {
            pageContent = getTextContent(object.content)?.trim();
            break;
          }

          case FileType.schema.typename: {
            const endpoint = client.config.values.runtime?.services?.ipfs?.gateway;
            if (endpoint && object.cid) {
              const url = join(endpoint, object.cid);
              log.info('fetching', { url });
              const res = await fetch(url);
              const buffer = await res.arrayBuffer();
              pageContent = (await promisify(textract.fromBufferWithMime)(
                res.headers.get('content-type')!,
                Buffer.from(buffer),
              )) as string;
              log.info('parsed', { cid: object.cid, pageContent: pageContent?.length });
            }
            break;
          }
        }

        if (pageContent?.length) {
          docs.push({
            metadata: {
              space: space?.toHex(),
              id: object.id,
            },
            pageContent,
          });
        }
      }
    };

  if (space) {
    const add = addDocuments(space.key);
    if (objects?.length) {
      await add(objects.filter(hasType(DocumentType.schema)));
      await add(objects.filter(hasType(FileType.schema)));
    } else {
      const { objects: documents } = space.db.query(DocumentType.filter());
      await add(documents);
      const { objects: files } = space.db.query(FileType.filter());
      await add(files);
    }
  } else {
    const spaces = client.spaces.get();
    for (const space of spaces) {
      const { objects: documents } = space.db.query(DocumentType.filter());
      await addDocuments(space.key)(documents);
      const { objects: files } = space.db.query(FileType.filter());
      await addDocuments(space.key)(files);
    }
  }

  if (docs.length) {
    const config = client.config;
    const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
      baseDir: dataDir ? join(dataDir, 'agent/functions/embedding') : undefined,
      apiKey: getKey(config, 'openai.com/api_key'),
    });

    try {
      await resources.store.initialize();

      // TODO(burdon): Remove deleted docs.
      await resources.store.addDocuments(docs);
      await resources.store.save();

      log.info('embedding', resources.info);
    } catch (err) {
      log.catch(err);
    }
  }

  return response.status(200);
});
