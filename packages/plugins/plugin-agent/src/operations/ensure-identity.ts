//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { IdentityDid, PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { buf, toPublicKey } from '@dxos/protocols/buf';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AgentOperation } from '#types';

import { type MemberSpace, admitAgent, mayAdmitAgent } from './admit-agent.ts';

/** About two minutes of attempts: long enough for the agent's new space to reach the caller's client. */
const JOIN_RETRIES = Schedule.exponential('2 seconds').pipe(Schedule.upTo({ times: 6 }));

/**
 * EDGE's answer to `POST /compute/brain`: the brain's identity and the caller's membership of the agent's default
 * space, as base64 protobuf.
 */
const ProvisionedBrain = Schema.Struct({
  identity: Schema.Struct({ identityDid: IdentityDid, identityKey: Schema.String }),
  membership: Schema.String,
});

/**
 * EDGE did not give the agent its identity, or the caller's HALO did not take the membership. Worth retrying: EDGE
 * answers its creator's repeated request with the same identity and membership, so nothing is minted twice.
 */
export class ProvisionIdentityError extends BaseError.extend(
  'ProvisionIdentityError',
  "The agent's identity could not be provisioned.",
) {}

/**
 * Admits the agent's identity to the space it was created in, when the creator may admit members there; a creator who
 * may not leaves the agent working without the membership (F-7.6). Fails while the space is not open yet, to be retried.
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
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      if (agent.did) {
        return { provisioned: false, identityDid: agent.did };
      }

      // Only a client has an authenticated EDGE client; elsewhere the agent keeps working without an identity.
      const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
      if (Option.isNone(edge)) {
        return { provisioned: false };
      }

      const { db } = yield* Database.Service;
      const { identity, membership } = yield* Effect.tryPromise({
        try: () =>
          edge.value.request(Context.default(), '/compute/brain', {
            method: 'POST',
            body: { agent: agent.id, homeSpaceId: db.spaceId, label: agent.name ?? '' },
          }),
        catch: (cause) => new ProvisionIdentityError({ cause }),
      }).pipe(
        Effect.flatMap((answer) =>
          Schema.decodeUnknownEffect(ProvisionedBrain)(answer).pipe(
            Effect.mapError((cause) => new ProvisionIdentityError({ cause })),
          ),
        ),
      );

      // The DID names the agent's brain, so it is set the moment EDGE answers: before the agent's first turn, and so
      // before anything reaches a brain.
      Obj.update(agent, (agent) => {
        agent.did = identity.identityDid;
      });

      // What remains only joins people and spaces, and is retried in the background: the caller's membership of the
      // agent's own space, then the agent's membership of the space it was created in.
      const client = yield* Capability.getOption(ClientCapabilities.Client);
      if (Option.isSome(client)) {
        const join = Effect.gen(function* () {
          // A `SpaceMember` in the caller's HALO is what makes their client join the agent's own space.
          yield* Effect.tryPromise({
            try: () =>
              client.value.halo.writeCredentials([buf.fromBinary(CredentialSchema, Buffer.from(membership, 'base64'))]),
            catch: (cause) => new ProvisionIdentityError({ cause }),
          });
          yield* admitHere(
            client.value.spaces.get(db.spaceId),
            toPublicKey(client.value.halo.identity.get()?.identityKey),
            identity.identityKey,
            agent.name,
          );
        });
        yield* Effect.forkDetach(
          join.pipe(
            Effect.retry(JOIN_RETRIES),
            Effect.catchCause((cause) => Effect.sync(() => log.warn('agent membership not written', { cause }))),
          ),
        );
      }
      return { provisioned: true, identityDid: identity.identityDid };
    }),
  ),
);

export default handler;
