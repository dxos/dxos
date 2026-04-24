//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Plan, Agent } from '../../../types';
import { GetContext } from './definitions';

export default GetContext.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const agent = yield* Agent.getFromChatContext;

      return {
        id: agent.id,
        name: agent.name,
        instructions: yield* agent.instructions.pipe(Database.load).pipe(
          Effect.map((_) => _.content),
          Effect.catchTag('ObjectNotFoundError', () => Effect.succeed('No instructions found.')),
        ),
        plan: yield* (
          agent.plan?.pipe(Database.load).pipe(
            Effect.map(Plan.formatPlan),
            Effect.catchTag('ObjectNotFoundError', () => Effect.succeed('No plan found.')),
          ) ?? Effect.succeed('No plan found.')
        ),
        artifacts: yield* Effect.forEach(agent.artifacts, (artifact) =>
          Effect.gen(function* () {
            return {
              name: artifact.name,
              type: yield* Database.load(artifact.data).pipe(
                Effect.map(Obj.getTypename),
                Effect.catchTag('ObjectNotFoundError', () => Effect.succeed('Artifact not found.')),
              ),
              dxn: artifact.data.dxn.toString(),
            };
          }),
        ),
      };
    }) as any,
  ),
);
