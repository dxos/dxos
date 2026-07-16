//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { Version } from '@dxos/versioning';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.CreateCheckpoint> =
  MarkdownOperation.CreateCheckpoint.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ doc, name, message }) {
        const document = yield* Database.load(doc);
        const target = yield* Database.load(document.content);
        const version = Version.create(document, { name, target, ...(message !== undefined && { message }) });
        return { versionId: version.id };
      }),
    ),
  );

export default handler;
