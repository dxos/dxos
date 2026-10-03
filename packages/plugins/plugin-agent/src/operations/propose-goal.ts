//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { Goal, MemoryOperation } from '#types';

import { AgentOperationError } from './errors.ts';

const handler: Operation.WithHandler<typeof MemoryOperation.ProposeGoal> = MemoryOperation.ProposeGoal.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ title, description, horizon, owners, parent }) {
      const entities = yield* Effect.forEach(owners, (owner) => Database.load(owner));
      if (entities.length === 0) {
        return yield* Effect.fail(new AgentOperationError({ message: 'A goal needs at least one owner.' }));
      }
      // The schema cannot express a Person | Organization ref, so the constraint is checked here.
      if (
        !entities.every(
          (entity) => Obj.instanceOf(Person.Person, entity) || Obj.instanceOf(Organization.Organization, entity),
        )
      ) {
        return yield* Effect.fail(new AgentOperationError({ message: 'Goal owners must be people or organizations.' }));
      }

      const goal = yield* Database.add(
        Goal.make({
          title,
          horizon,
          owners: entities.map((entity) => Ref.make<Obj.Unknown>(entity)),
          ...(description ? { description } : {}),
          ...(parent ? { parent: Ref.make<Obj.Unknown>(yield* Database.load(parent)) } : {}),
        }),
      );

      return { goal: Ref.make(goal) };
    }),
  ),
);

export default handler;
