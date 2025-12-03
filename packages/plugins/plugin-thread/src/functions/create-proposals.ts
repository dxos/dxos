//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { ArtifactId, computeDiffsWithCursors } from '@dxos/assistant';
import { Obj, Ref, Relation } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { defineFunction } from '@dxos/functions';
import { DXN } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { AnchoredTo, Message, Thread } from '@dxos/types';
import { Database } from '@dxos/echo';

export default defineFunction({
  key: 'dxos.org/function/thread/create-proposals',
  name: 'Create Proposals',
  description: 'Proposes a set of changes to a document.',
  inputSchema: Schema.Struct({
    id: ArtifactId,
    diffs: Schema.Array(Schema.String).annotations({
      description: 'The diffs to propose for the document.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { id, diffs: _diffs } }) {
    const object = yield* Database.Service.resolve(DXN.parse(id), Markdown.Document);
    const content = yield* Effect.promise(() => object.content.load());
    const accessor = createDocAccessor(content, ['content']);

    yield* Function.pipe(
      computeDiffsWithCursors(accessor, _diffs),
      Array.map(
        Effect.fnUntraced(function* ({ cursor, text }) {
          const proposal = Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks: [{ _tag: 'proposal', text }],
          });
          const thread = Thread.make({ name: 'Proposal', messages: [Ref.make(proposal)], status: 'active' });
          const relation = Relation.make(AnchoredTo.AnchoredTo, {
            [Relation.Source]: thread,
            [Relation.Target]: object,
            anchor: cursor,
          });
          yield* Database.Service.add(thread);
          yield* Database.Service.add(relation);
        }),
      ),
      Effect.allWith({ concurrency: 'unbounded' }),
    );
  }),
});
