//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Person } from '@dxos/types';

import { AgentOperation, ChatParticipant } from '#types';

import { ensureParticipantChat } from './ensure-participant-chat.ts';

const handler: Operation.WithHandler<typeof AgentOperation.OpenPrivateChat> = AgentOperation.OpenPrivateChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, identityDid, name, remote }) {
      const agent = yield* Database.load(agentRef);
      const people = yield* Database.query(Filter.type(Person.Person)).run;
      const known = people.find((person) =>
        (person.identities ?? []).some(
          (identity) => identity.label === ChatParticipant.IDENTITY_LABEL && identity.value === identityDid,
        ),
      );
      const person =
        known ??
        (yield* Database.add(
          Person.make({ fullName: name, identities: [{ label: ChatParticipant.IDENTITY_LABEL, value: identityDid }] }),
        ));
      const chat = yield* ensureParticipantChat(agent, person, { owner: identityDid, remote });
      return { chat: Ref.make(chat), person: Ref.make<Obj.Unknown>(person) };
    }),
  ),
);

export default handler;
