//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { HasSubject } from '@dxos/types';

import { Goal, Memory, MemoryOperation, Profile } from '#types';

const handler: Operation.WithHandler<typeof MemoryOperation.Recall> = MemoryOperation.Recall.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, query, limit }) {
      const entity = subject ? yield* Database.load(subject) : undefined;
      const candidates = entity
        ? (yield* Database.query(Query.select(Filter.id(entity.id)).targetOf(HasSubject.HasSubject)).run)
            .map((relation) => Relation.getSource(relation))
            .filter(Obj.instanceOf(Memory.Memory))
        : yield* Database.query(Filter.type(Memory.Memory)).run;

      const needle = query?.trim().toLowerCase();
      const memories = candidates
        .filter((memory) => memory.status === 'active')
        .filter((memory) => !needle || memory.content.toLowerCase().includes(needle))
        .sort(Profile.byNewest)
        .slice(0, limit ?? undefined);

      const goals = (yield* Database.query(Filter.type(Goal.Goal)).run)
        .filter(Profile.isLiveGoal)
        .filter((goal) => !entity || goal.owners.some((owner) => Profile.refersTo(owner, entity.id)));

      return {
        memories: memories.map((memory) => ({
          memory: Ref.make(memory),
          content: memory.content,
          kind: memory.kind,
          origin: memory.origin,
          observedAt: memory.observedAt,
        })),
        goals: goals.map((goal) => ({
          goal: Ref.make(goal),
          title: goal.title,
          horizon: goal.horizon,
          status: goal.status,
        })),
      };
    }),
  ),
);

export default handler;
