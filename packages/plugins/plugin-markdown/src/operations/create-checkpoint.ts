//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { createCheckpoint } from '../model';
import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.CreateCheckpoint> =
  MarkdownOperation.CreateCheckpoint.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ doc, name, message }) {
        const document = yield* Database.load(doc);
        yield* Database.load(document.content);
        const version = createCheckpoint(document, { name, ...(message !== undefined && { message }) });
        return { versionId: version.id };
      }),
    ),
  );

export default handler;
