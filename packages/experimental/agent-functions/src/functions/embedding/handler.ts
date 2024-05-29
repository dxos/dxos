//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';
import { promisify } from 'node:util';
import textract from 'textract';

import { DocumentType, FileType } from '@braneframe/types';
import { Filter, hasType, loadObjectReferences } from '@dxos/echo-db';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ChainDocument, type ChainVariant, createChainResources } from '../../chain';
import { getKey } from '../../util';

const types = [DocumentType, FileType];

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { client, dataDir } = context;
  const { space, objects } = event.data;
  invariant(space);
  invariant(dataDir);

  const docs: ChainDocument[] = [];
  const addDocuments =
    (space: PublicKey | undefined = undefined) =>
    async (objects: EchoReactiveObject<any>[]) => {
      for (const object of objects) {
        let pageContent: string | undefined;
        log.info('processing', { object: { id: object.id, type: object.__typename } });
        if (object instanceof DocumentType) {
          pageContent = (await loadObjectReferences(object, (o) => o.content)).content?.trim();
        } else if (object instanceof FileType) {
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
      await add(objects.filter(hasType(DocumentType)));
      await add(objects.filter(hasType(FileType)));
    } else {
      const { objects: documents } = await space.db.query(Filter.schema(DocumentType)).run();
      await add(documents);
      const { objects: files } = await space.db.query(Filter.schema(FileType)).run();
      await add(files);
    }
  } else {
    const spaces = client.spaces.get();
    for (const space of spaces) {
      const { objects: documents } = await space.db.query(Filter.schema(DocumentType)).run();
      await addDocuments(space.key)(documents);
      const { objects: files } = await space.db.query(Filter.schema(FileType)).run();
      await addDocuments(space.key)(files);
    }
  }

  if (docs.length) {
    const config = client.config;
    const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'ollama', {
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
}, types);
