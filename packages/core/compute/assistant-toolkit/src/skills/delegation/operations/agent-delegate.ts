//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';

import { AgentDelegate } from './definitions.ts';

const handler: Operation.WithHandler<typeof AgentDelegate> = AgentDelegate.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent: name, message }) {
      const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
      const receiver = agents.find((candidate) => candidate.name === name);
      if (!receiver) {
        const known = agents.flatMap((candidate) => (candidate.name ? [candidate.name] : []));
        return `There is no agent named "${name}" in this space. Agents here: ${known.join(', ') || 'none'}.`;
      }
      const { session } = yield* Agent.delegate({
        target: { kind: 'agent', agent: Obj.getURI(receiver) },
        message: [{ _tag: 'text', text: message }],
      }).pipe(Effect.orDie);
      return `Handed the request to ${name} (session ${session}). It works on its own; there is nothing to wait for.`;
    }),
  ),
);

export default handler;
