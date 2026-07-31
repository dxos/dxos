//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Version } from '@dxos/versioning';

import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.CreateCheckpoint> =
  MarkdownOperation.CreateCheckpoint.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ doc, name, message }) {
        // LLM-provided ref (may decode without a resolver): resolve through the db, not `ref.tryLoad`.
        const document = yield* Database.resolve(doc, Markdown.Document);
        const target = yield* Database.load(document.content);
        const version = Version.create(document, { name, target, ...(message !== undefined && { message }) });
        return { versionId: version.id };
      }),
    ),
  );

export default handler;
