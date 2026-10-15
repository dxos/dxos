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

/** Attempts at provisioning before the agent opens without an identity: a new space takes a moment to reach EDGE. */
const PROVISIONING_RETRIES = Schedule.exponential('500 millis').pipe(Schedule.upTo({ times: 4 }));

/** How long creation waits on EDGE before the agent opens without an identity. */
const PROVISIONING_TIMEOUT = '15 seconds';

/**
 * Creates an agent in the space with its identity, so the brain is named by the identity's DID from the start: EDGE
 * answers in about a second, before the agent's chat opens or anything reaches its brain. When EDGE cannot provision
 * one, the agent opens without an identity and works as agents without one always have, with a brain named by its id.
 */
export const createAgentWithIdentity = Effect.fnUntraced(function* (db: Database.Database, input: { name: string }) {
  const { agent } = yield* Operation.invoke(AgentOperation.CreateAgent, input, { spaceId: db.spaceId });
  // The returned ref crossed the operation boundary without a resolver, so it is re-made on the database.
  const object = yield* Effect.promise(() => db.makeRef<Agent.Agent>(agent.uri).load());
  yield* Operation.invoke(AgentOperation.EnsureIdentity, { agent: Ref.make(object) }, { spaceId: db.spaceId }).pipe(
    // EDGE answers its creator's repeated request with the same identity, so a retry mints nothing twice.
    Effect.retry(PROVISIONING_RETRIES),
    Effect.timeout(PROVISIONING_TIMEOUT),
    Effect.catchCause((cause) => Effect.sync(() => log.warn('agent identity not provisioned', { cause }))),
  );
  return object;
});
