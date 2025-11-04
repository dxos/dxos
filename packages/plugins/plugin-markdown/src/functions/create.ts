//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { defineFunction } from '@dxos/functions';
import { addObject } from '@dxos/schema';

import { Markdown } from '../types';

export default defineFunction({
  key: 'dxos.org/function/markdown/create',
  name: 'Create',
  description: 'Creates a new markdown document and adds it to the space.',
  inputSchema: Schema.Struct({
    name: Schema.String,
    content: Schema.String,
  }),
  outputSchema: Schema.Struct({
    id: ArtifactId,
  }),
  handler: Effect.fn(function* ({ data: { name, content } }) {
    const object = Markdown.makeDocument({ name, content });
    yield* addObject({ object });

    return {
      id: object.id,
    };
  }),
});
