//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { DatabaseService, defineFunction } from '@dxos/functions';

import { Markdown } from '../types';

export default defineFunction({
  name: 'dxos.org/function/markdown/create',
  description: 'Creates a new markdown document.',
  inputSchema: Schema.Void,
  outputSchema: Markdown.Document,
  handler: Effect.fn(function* () {
    return yield* DatabaseService.add(Markdown.makeDocument());
  }),
});
