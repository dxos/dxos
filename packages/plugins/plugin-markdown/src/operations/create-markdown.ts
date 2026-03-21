//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { CreateMarkdown } from './definitions';

import { Markdown } from '../types';

const handler: Operation.WithHandler<typeof CreateMarkdown> = CreateMarkdown.pipe(
  Operation.withHandler(({ name, content }) =>
    Effect.succeed({
      object: Markdown.make({ name, content }),
    }),
  ),
);

export default handler;
