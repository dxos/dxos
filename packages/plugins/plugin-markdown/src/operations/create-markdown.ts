//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.CreateMarkdown> = MarkdownOperation.CreateMarkdown.pipe(
  Operation.withHandler(({ name, content }) =>
    Effect.succeed({
      object: Markdown.make({ name, content }),
    }),
  ),
);

export default handler;
