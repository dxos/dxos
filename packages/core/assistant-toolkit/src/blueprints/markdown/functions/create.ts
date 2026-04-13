//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Markdown } from '@dxos/plugin-markdown/types';

import { Create } from './definitions';

export default Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content }) {
      const doc = yield* Database.add(Markdown.make({ name, content }));
      return { document: Ref.make(doc) };
    }),
  ),
);
