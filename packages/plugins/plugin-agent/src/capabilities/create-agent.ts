//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { AgentOperation } from '#types';

/**
 * Creates an agent in the space and gives it its own identity on EDGE. The agent is created even when EDGE cannot
 * provision one, and then works as agents without an identity always have.
 */
export const createAgentWithIdentity = (db: Database.Database, input: { name: string }) =>
  Effect.gen(function* () {
    const { agent } = yield* Operation.invoke(AgentOperation.CreateAgent, input, { spaceId: db.spaceId });
    // The returned ref crossed the operation boundary without a resolver, so it is re-made on the database.
    const object = yield* Effect.promise(() => db.makeRef<Agent.Agent>(agent.uri).load());
    yield* Operation.invoke(AgentOperation.EnsureIdentity, { agent: Ref.make(object) }, { spaceId: db.spaceId }).pipe(
      Effect.catchCause((cause) => Effect.sync(() => log.warn('agent identity not provisioned', { cause }))),
    );
    return object;
  });
