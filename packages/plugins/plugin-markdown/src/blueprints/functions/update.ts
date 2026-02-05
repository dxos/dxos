//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId, applyDiffs } from '@dxos/assistant';
import { Database } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

import { Markdown } from '../../types';

// TODO(wittjosiah): Reconcile with ThreadAction.AddProposal.
export default defineFunction({
  key: 'dxos.org/function/markdown/update',
  name: 'Update',
  description: trim`
    Applies a set of diffs to the markdown document.
  `,
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the markdown document.',
    }),
    diffs: Schema.Array(Schema.String).annotations({
      description: 'The diffs to apply to the document.',
    }),
  }),
  outputSchema: Schema.Struct({
    newContent: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id, diffs } }) {
    const object = yield* Database.resolve(ArtifactId.toDXN(id), Markdown.Document);
    const content = yield* Effect.promise(() => object.content.load());
    const accessor = createDocAccessor(content, ['content']);
    const newContent = applyDiffs(accessor, diffs, { errorOnNotFound: true });
    return {
      newContent,
    };
  }),
});
