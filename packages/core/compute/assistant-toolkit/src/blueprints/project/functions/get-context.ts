//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { Plan, Agent } from '../../../types';
import { GetContext } from './definitions';

export default GetContext.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      // This runs unconditionally during system-prompt formatting. A delegated sub-agent has no
      // agent bound to its context, so degrade gracefully rather than failing the whole turn.
      const agentOption = yield* Effect.option(Agent.getFromChatContext);
      if (Option.isNone(agentOption)) {
        return { id: '', name: '', instructions: 'No agent context.', plan: 'No plan found.', artifacts: [] };
      }
      const agent = agentOption.value;

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
