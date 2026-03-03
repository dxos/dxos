//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { computeDiffsWithCursors } from '@dxos/assistant';
import { Database, Obj, Ref, Relation, Type } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';
import { AnchoredTo, Message, Thread } from '@dxos/types';

export default defineFunction({
  key: 'dxos.org/function/thread/create-proposals',
  name: 'Create Proposals',
  description: 'Proposes a set of changes to a document.',
  inputSchema: Schema.Struct({
    doc: Type.Ref(Markdown.Document).annotations({
      description: 'The ID of the document.',
    }),
    diffs: Schema.Array(Schema.String).annotations({
      description: 'The diffs to propose for the document.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { doc, diffs: _diffs } }) {
    const object = yield* Database.load(doc);
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
          yield* Database.add(thread);
          yield* Database.add(relation);
        }),
      ),
      Effect.allWith({ concurrency: 'unbounded' }),
    );
  }),
});
