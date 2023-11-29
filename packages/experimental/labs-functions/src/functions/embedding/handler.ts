//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';
import textract from 'textract';

import { Document as DocumentType, File as FileType } from '@braneframe/types';
import { Trigger } from '@dxos/async';
import { type TypedObject } from '@dxos/echo-schema';
import { type FunctionHandler, type FunctionSubscriptionEvent } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ChainDocument, createOllamaChainResources } from '../../chain';
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
    async (objects: TypedObject[]) => {
      for (const object of objects) {
        let pageContent: string | undefined;
        switch (object.__typename) {
          case DocumentType.schema.typename: {
            pageContent = object.content?.text.trim();
            break;
          }

          case FileType.schema.typename: {
            const endpoint = client.config.values.runtime?.services?.ipfs?.gateway;
            if (endpoint && object.cid) {
              const url = join(endpoint, object.cid);
              log.info('fetching', { url });
              const res = await fetch(url);
              const buffer = await res.arrayBuffer();
              const processing = new Trigger<string>();
              textract.fromBufferWithMime(res.headers.get('content-type')!, Buffer.from(buffer), (error, text) => {
                if (error) {
                  processing.throw(error);
                }
                processing.wake(text);
              });
              pageContent = await processing.wait();
              log.info('parsed', { cid: object.cid, text: pageContent?.length });
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

        await addDocuments(space.key)(objects);
      } else {
        const { objects: documents } = space.db.query(DocumentType.filter());
        await addDocuments(space.key)(documents);
        const { objects: files } = space.db.query(FileType.filter());
        await addDocuments(space.key)(files);
      }
    }
  } else {
    for (const space of spaces) {
      const { objects: documents } = space.db.query(DocumentType.filter());
      await addDocuments(space.key)(documents);
      const { objects: files } = space.db.query(FileType.filter());
      await addDocuments(space.key)(files);
    }
  }

  if (docs.length) {
    // TODO(burdon): Configure model variant based on env.
    const config = client.config;
    const resources = createOllamaChainResources({
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
