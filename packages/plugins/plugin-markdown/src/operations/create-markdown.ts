//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { CreateMarkdown } from './definitions';

import { Markdown } from '../types';

export default CreateMarkdown.pipe(
  Operation.withHandler(({ name, content }) =>
    Effect.succeed({
      object: Markdown.make({ name, content }),
    }),
  ),
);
