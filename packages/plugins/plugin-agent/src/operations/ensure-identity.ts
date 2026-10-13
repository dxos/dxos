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
import { IdentityDid } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { buf } from '@dxos/protocols/buf';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AgentOperation } from '#types';

/** EDGE's answer to `POST /compute/brain`: the brain's identity and the owner's credential, base64 protobuf. */
const ProvisionedBrain = Schema.Struct({
  identity: Schema.Struct({ identityDid: IdentityDid }),
  credential: Schema.String,
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

      const { identity, credential } = provisioned.value;
      Obj.update(agent, (agent) => {
        agent.did = identity.identityDid;
      });

      // The owner keeps their `AgentAdmin` credential in their HALO, to present it.
      const client = yield* Capability.getOption(ClientCapabilities.Client);
      if (Option.isSome(client)) {
        yield* Effect.tryPromise(() =>
          client.value.halo.writeCredentials([buf.fromBinary(CredentialSchema, Buffer.from(credential, 'base64'))]),
        ).pipe(Effect.catch((error) => Effect.sync(() => log.warn('owner credential not written to HALO', { error }))));
      }
      return { provisioned: true, identityDid: identity.identityDid };
    }),
  ),
);

export default handler;
