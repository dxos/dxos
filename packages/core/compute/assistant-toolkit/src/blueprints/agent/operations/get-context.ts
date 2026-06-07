//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { Plan, Agent } from '../../../types';
import { GetContext } from './definitions';

export default GetContext.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      // This runs unconditionally during system-prompt formatting. A delegated sub-agent has no
      // agent bound to its context, so degrade gracefully for the zero-agent case — but still
      // surface the "more than one agent" invariant rather than masking every failure.
      const agents = yield* AiContext.Service.findObjects(Agent.Agent);
      if (agents.length === 0) {
        return { id: '', name: '', instructions: 'No agent context.', plan: 'No plan found.', artifacts: [] };
      }
      if (agents.length > 1) {
        return yield* Effect.fail(new Error(`There should be exactly one agent in context. Got: ${agents.length}`));
      }
      const agent = agents[0];

      return {
        id: agent.id,
        name: agent.name,
        instructions: yield* agent.instructions.pipe(Database.load).pipe(
          Effect.map((_) => _.content),
          Effect.catchTag('EntityNotFoundError', () => Effect.succeed('No instructions found.')),
        ),
        plan: yield* (
          agent.plan?.pipe(Database.load).pipe(
            Effect.map(Plan.formatPlan),
            Effect.catchTag('EntityNotFoundError', () => Effect.succeed('No plan found.')),
          ) ?? Effect.succeed('No plan found.')
        ),
        artifacts: yield* Effect.forEach(agent.artifacts, (artifact) =>
          Effect.gen(function* () {
            return {
              name: artifact.name,
              type: yield* Database.load(artifact.data).pipe(
                Effect.map(Obj.getTypename),
                Effect.catchTag('EntityNotFoundError', () => Effect.succeed('Artifact not found.')),
              ),
              dxn: artifact.data.uri,
            };
          }),
        ),
      };
    }) as any,
  ),
  Operation.opaqueHandler,
);
