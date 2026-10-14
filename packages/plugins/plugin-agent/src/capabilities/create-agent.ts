//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { AgentOperation } from '#types';

/** About two minutes of attempts: long enough for a new space to reach EDGE, which refuses its members until then. */
const PROVISIONING_RETRIES = Schedule.exponential('2 seconds').pipe(Schedule.upTo({ times: 6 }));

/**
 * Creates an agent in the space and returns it at once; its identity, its own space and its membership are minted on
 * EDGE in the background, since its chat runs on EDGE without them. The agent stays even when EDGE cannot provision
 * one, and then works as agents without an identity always have.
 */
export const createAgentWithIdentity = Effect.fnUntraced(function* (db: Database.Database, input: { name: string }) {
  const { agent } = yield* Operation.invoke(AgentOperation.CreateAgent, input, { spaceId: db.spaceId });
  // The returned ref crossed the operation boundary without a resolver, so it is re-made on the database.
  const object = yield* Effect.promise(() => db.makeRef<Agent.Agent>(agent.uri).load());
  yield* Effect.forkDetach(
    Operation.invoke(AgentOperation.EnsureIdentity, { agent: Ref.make(object) }, { spaceId: db.spaceId }).pipe(
      // EDGE answers its creator's repeated request with the same identity, so a retry mints nothing twice.
      Effect.retry(PROVISIONING_RETRIES),
      Effect.catchCause((cause) => Effect.sync(() => log.warn('agent identity not provisioned', { cause }))),
    ),
  );
  return object;
});
