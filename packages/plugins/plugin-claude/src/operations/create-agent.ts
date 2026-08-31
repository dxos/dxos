//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ClaudeAgentOperation, ClaudeManagedAgent } from '#types';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.CreateAgent> = ClaudeAgentOperation.CreateAgent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, model, effort, systemPrompt, skills, environmentId }) {
      const agent = yield* Database.add(
        ClaudeManagedAgent.make({
          name,
          description,
          model,
          effort,
          systemPrompt,
          // Copied because the decoded input is readonly and the object field is mutable.
          skills: skills ? [...skills] : undefined,
          environmentId,
        }),
      );

      return { id: agent.id };
    }),
  ),
);

export default handler;
