//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { IdentityDid, PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { buf } from '@dxos/protocols/buf';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AgentOperation } from '#types';

import { admitAgent } from './admit-agent.ts';

/**
 * EDGE's answer to `POST /compute/brain`: the brain's identity and the caller's membership of the agent's default
 * space, as base64 protobuf.
 */
const ProvisionedBrain = Schema.Struct({
  identity: Schema.Struct({ identityDid: IdentityDid, identityKey: Schema.String }),
  membership: Schema.String,
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
      const provisioned = yield* Effect.tryPromise(() =>
        edge.value.request(Context.default(), '/compute/brain', {
          method: 'POST',
          body: { agent: agent.id, homeSpaceId: db.spaceId, label: agent.name ?? '' },
        }),
      ).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(ProvisionedBrain)),
        Effect.tapError((error) => Effect.sync(() => log.warn('agent identity not provisioned', { error }))),
        Effect.option,
      );
      if (Option.isNone(provisioned)) {
        return { provisioned: false };
      }

      const { identity, membership } = provisioned.value;
      Obj.update(agent, (agent) => {
        agent.did = identity.identityDid;
      });

      // A `SpaceMember` in the caller's HALO is what makes their client join the agent's default space.
      const client = yield* Capability.getOption(ClientCapabilities.Client);
      if (Option.isSome(client)) {
        const credential = buf.fromBinary(CredentialSchema, Buffer.from(membership, 'base64'));
        yield* Effect.tryPromise(() => client.value.halo.writeCredentials([credential])).pipe(
          Effect.catch((error) => Effect.sync(() => log.warn('membership not written to HALO', { error }))),
        );

        // The agent is a member of the space it is created in, when that space takes members (see `admitAgent`).
        const space = client.value.spaces.get(db.spaceId);
        if (space) {
          yield* Effect.try(() => PublicKey.fromHex(identity.identityKey)).pipe(
            Effect.flatMap((identityKey) => admitAgent(space, identityKey, agent.name)),
            Effect.catch((error) => Effect.sync(() => log.warn('agent not admitted to its space', { error }))),
          );
        }
      }
      return { provisioned: true, identityDid: identity.identityDid };
    }),
  ),
);

export default handler;
