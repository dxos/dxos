//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { type ProvisionedBrain } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { buf, toPublicKey } from '@dxos/protocols/buf';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AgentOperation } from '#types';

import { type MemberSpace, admitAgent, mayAdmitAgent } from './admit-agent.ts';

/** About two minutes of attempts: long enough for the agent's new space to reach the caller's client. */
const JOIN_RETRIES = Schedule.exponential('2 seconds').pipe(Schedule.upTo({ times: 6 }));

/**
 * `Obj.Meta` key source naming the identity that provisioned the agent: EDGE answers only its creator again with the
 * same membership, so only the creator can finish a join that failed.
 */
export const CREATOR_SOURCE = 'org.dxos.agent/creator';

/** `Obj.Meta` key source of the agent's own space, which its creator joins. */
export const SPACE_SOURCE = 'org.dxos.agent/space';

/**
 * The agents whose join ran in this runtime and did not fail, which opening one of them must not start again: a finished
 * join's credentials take a moment to reach the client, so checking them at once would find them missing.
 */
const joined = new Set<string>();

/**
 * EDGE did not give the agent its identity, or the caller's HALO did not take the membership. Worth retrying: EDGE
 * answers its creator's repeated request with the same identity and membership, so nothing is minted twice.
 */
export class ProvisionIdentityError extends BaseError.extend(
  'ProvisionIdentityError',
  "The agent's identity could not be provisioned.",
) {}

/** The steps of the join after provisioning that are still to run. */
export type Join = {
  /** The caller's membership of the agent's own space, written to their HALO. */
  membership: boolean;
  /** The agent's identity, admitted to the space it lives in. */
  admission: boolean;
};

/**
 * What the join after provisioning left undone, as the caller's client sees it, when the caller is the agent's creator
 * (`CREATOR_SOURCE`); `undefined` when nothing is. An admission the agent ever had counts, removed or not, so this never
 * re-admits an agent a space's admin removed.
 */
export const missingJoin = ({
  agent,
  self,
  hasSpace,
  space,
}: {
  agent: Agent.Agent;
  self: { did: string; identityKey: PublicKey } | undefined;
  /** Whether the caller's client holds the space, which it does once its HALO has the membership. */
  hasSpace: (spaceId: string) => boolean;
  /** The space the agent lives in. */
  space: MemberSpace | undefined;
}): Join | undefined => {
  if (!agent.did || !self || Obj.getKeys(agent, CREATOR_SOURCE).at(0)?.id !== self.did) {
    return undefined;
  }
  const own = Obj.getKeys(agent, SPACE_SOURCE).at(0)?.id;
  const membership = own !== undefined && !hasSpace(own);
  const admission =
    space !== undefined &&
    mayAdmitAgent(space, self.identityKey) &&
    !space.members.get().some((member) => member.identity?.did === agent.did);
  return membership || admission ? { membership, admission } : undefined;
};

/**
 * Admits the agent's identity to the space it was created in, when the creator may admit members there; a creator who
 * may not leaves the agent working without the membership (F-7.2). Fails while the space is not open yet, to be retried.
 */
const admitHere = Effect.fnUntraced(function* (
  space: MemberSpace | undefined,
  self: PublicKey | undefined,
  identityKeyHex: string,
  name: string | undefined,
) {
  if (!space || !self) {
    return yield* Effect.fail(new ProvisionIdentityError());
  }
  if (!mayAdmitAgent(space, self)) {
    return;
  }
  const identityKey = yield* Effect.try({
    try: () => PublicKey.fromHex(identityKeyHex),
    catch: (cause) => new ProvisionIdentityError({ cause }),
  });
  yield* admitAgent(space, identityKey, name).pipe(Effect.mapError((cause) => new ProvisionIdentityError({ cause })));
});

const handler: Operation.WithHandler<typeof AgentOperation.EnsureIdentity> = AgentOperation.EnsureIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, mint }) {
      const agent = yield* Database.load(agentRef);
      const { db } = yield* Database.Service;
      // Only a client has an authenticated EDGE client; elsewhere the agent keeps working without an identity.
      const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
      const client = yield* Capability.getOption(ClientCapabilities.Client);
      if (Option.isNone(edge)) {
        return { provisioned: false, ...(agent.did ? { identityDid: agent.did } : {}) };
      }

      const provision = Effect.tryPromise({
        try: () =>
          edge.value.provisionBrain(Context.default(), {
            agent: agent.id,
            homeSpaceId: db.spaceId,
            label: agent.name ?? '',
          }),
        catch: (cause) => new ProvisionIdentityError({ cause }),
      });

      // Only joins people and spaces, so it runs in the background, retried: the caller's membership of the agent's own
      // space, then the agent's membership of the space it was created in.
      const join = (did: string, { identity, membership }: ProvisionedBrain, steps: Join): Effect.Effect<void> => {
        if (Option.isNone(client)) {
          return Effect.void;
        }
        const run = Effect.gen(function* () {
          if (steps.membership) {
            // A `SpaceMember` in the caller's HALO is what makes their client join the agent's own space.
            yield* Effect.tryPromise({
              try: () =>
                client.value.halo.writeCredentials([
                  buf.fromBinary(CredentialSchema, Buffer.from(membership, 'base64')),
                ]),
              catch: (cause) => new ProvisionIdentityError({ cause }),
            });
          }
          if (steps.admission) {
            yield* admitHere(
              client.value.spaces.get(db.spaceId),
              toPublicKey(client.value.halo.identity.get()?.identityKey),
              identity.identityKey,
              agent.name,
            );
          }
        });
        joined.add(did);
        return Effect.forkDetach(
          run.pipe(
            Effect.retry(JOIN_RETRIES),
            Effect.catchCause((cause) =>
              Effect.sync(() => {
                // Forgotten, so that opening the agent finishes the join.
                joined.delete(did);
                log.warn('agent membership not written', { cause });
              }),
            ),
          ),
        ).pipe(Effect.asVoid);
      };

      if (agent.did) {
        // Opening the agent finishes, for its creator, a join whose retries all failed; nothing else asks EDGE.
        const self = Option.getOrUndefined(client)?.halo.identity.get();
        const selfKey = toPublicKey(self?.identityKey);
        const missing =
          Option.isSome(client) && !joined.has(agent.did)
            ? missingJoin({
                agent,
                self: self && selfKey ? { did: self.did, identityKey: selfKey } : undefined,
                hasSpace: (spaceId) => client.value.spaces.get().some((space) => space.id === spaceId),
                space: client.value.spaces.get(db.spaceId),
              })
            : undefined;
        if (missing) {
          yield* join(agent.did, yield* provision, missing);
        }
        return { provisioned: false, identityDid: agent.did };
      }
      // The DID names the brain, so an agent that has already talked would lose what it learned.
      if (!mint) {
        return { provisioned: false };
      }

      const provisioned = yield* provision;
      const { identityDid, defaultSpaceId } = provisioned.identity;
      const creator = Option.getOrUndefined(client)?.halo.identity.get()?.did;
      // The DID names the agent's brain, so it is set the moment EDGE answers: before the agent's first turn, and so
      // before anything reaches a brain. Its creator and own space let opening the agent finish a failed join.
      Obj.update(agent, (agent) => {
        agent.did = identityDid;
        if (creator) {
          Obj.getMeta(agent).keys.push({ source: CREATOR_SOURCE, id: creator });
        }
        if (defaultSpaceId) {
          Obj.getMeta(agent).keys.push({ source: SPACE_SOURCE, id: defaultSpaceId });
        }
      });
      yield* join(identityDid, provisioned, { membership: true, admission: true });
      return { provisioned: true, identityDid };
    }),
  ),
);

export default handler;
