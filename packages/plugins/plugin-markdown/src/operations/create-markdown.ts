//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Markdown } from '../types';
import { CreateMarkdown } from './definitions';

const handler: Operation.WithHandler<typeof CreateMarkdown> = CreateMarkdown.pipe(
  Operation.withHandler(({ name, content }) =>
    Effect.succeed({
      object: Markdown.make({ name, content }),
    }),
  ),
);

export default handler;
