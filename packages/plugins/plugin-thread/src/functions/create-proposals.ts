//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { computeDiffsWithCursors } from '@dxos/assistant';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { Operation } from '@dxos/operation';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { CreateProposals } from './definitions';

export default CreateProposals.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, diffs }) {
      const object = yield* Database.load(doc);
      const content = yield* Effect.promise(() => object.content.load());
      const accessor = createDocAccessor(content, ['content']);

      yield* Function.pipe(
        computeDiffsWithCursors(accessor, diffs),
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
  ),
);
