//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as Agent from '@dxos/assistant/Agent';
import type * as Operation from '@dxos/compute/Operation';
import { PublicKey, type SpaceId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { toPublicKey } from '@dxos/protocols/buf';

import { AgentOperation, AgentSpace } from '#types';

/** The homes of the agents among `administered` whose identity `admitted` names, other than the space's own agent. */
export const admittedHomes = (
  administered: readonly AgentSpace.Summary[],
  admitted: readonly PublicKey[],
  spaceId: SpaceId,
): string[] =>
  administered.flatMap(({ spaceId: own, identityKey, home }) =>
    home && own !== spaceId && identityKey && admitted.some((key) => key.equals(identityKey)) ? [home] : [],
  );

/** Attempts after a failure: a space just created takes a moment to reach EDGE. */
const RETRIES = Schedule.exponential('1 second').pipe(Schedule.upTo({ times: 3 }));

type AddMembersInvocation = {
  input: Operation.Definition.Input<typeof SpaceOperation.AddMembers>;
  output: Operation.Definition.Output<typeof SpaceOperation.AddMembers>;
};

const isAddMembers = <E extends { operation: Operation.Definition.Any }>(event: E): event is E & AddMembersInvocation =>
  event.operation.meta.key.toString() === SpaceOperation.AddMembers.meta.key.toString();

/**
 * Puts an agent to work in a space after the members panel admits it like any contact (`SpaceOperation.AddMembers`):
 * for each admitted agent this identity administers, `InviteAgent` registers the space on EDGE and makes its presence.
 * TODO(mykola): Consider having EDGE accept the agent's regular inbox invitation instead, checking who signed its
 *  admission, so no step of the admitting client's follows the admission.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const invoker = yield* Capabilities.OperationInvoker;
    const client = yield* ClientCapabilities.Client;

    yield* Effect.forkScoped(
      Stream.fromPubSub(invoker.invocations).pipe(
        Stream.filter(isAddMembers),
        Stream.runForEach((event) =>
          Effect.gen(function* () {
            // The pubsub carries every operation's invocation untyped; these are `AddMembers`' own.
            const { space }: AddMembersInvocation['input'] = event.input;
            const { admitted: admittedKeys }: AddMembersInvocation['output'] = event.output;
            const self = toPublicKey(client.halo.identity.get()?.identityKey);
            const administered = self ? AgentSpace.administeredAgents(client.spaces.get(), self) : [];
            if (administered.length === 0 || admittedKeys.length === 0) {
              return;
            }
            const admitted = admittedKeys.map((key) => PublicKey.from(key));
            for (const home of admittedHomes(administered, admitted, space.id)) {
              yield* invoker
                .invoke(
                  AgentOperation.InviteAgent,
                  { agent: space.db.makeRef<Agent.Agent>(URI.make(home)) },
                  { spaceId: space.id },
                )
                .pipe(Effect.retry(RETRIES));
            }
          }).pipe(
            // The agent stays a member that does not answer there; the picker no longer offers it, since it is a member.
            Effect.catchCause((cause) =>
              Cause.hasInterruptsOnly(cause)
                ? Effect.failCause(cause)
                : Effect.sync(() => log.warn('admitted agent not put to work', { cause: Cause.pretty(cause) })),
            ),
          ),
        ),
      ),
    );

    return [];
  }),
);
