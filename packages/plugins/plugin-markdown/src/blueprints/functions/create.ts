//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { CollectionModel } from '@dxos/schema';

import { Markdown } from '../../types';

export default defineFunction({
  key: 'org.dxos.function.markdown.create',
  name: 'Create',
  description: 'Creates a new markdown document and adds it to the space.',
  inputSchema: Schema.Struct({
    name: Schema.String,
    content: Schema.String,
  }),
  outputSchema: Schema.Struct({
    id: Schema.String.annotations({
      description: 'The DXN of the created document.',
    }),
  }),
  handler: Effect.fn(function* ({ data: { name, content } }) {
    const object = Markdown.make({ name, content });
    yield* CollectionModel.add({ object });

    return {
      id: Obj.getDXN(object).toString(),
    };
  }),
});
