//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Person } from '@dxos/types';

import { ChatParticipant, RelayOperation } from '#types';

import { AgentOperationError } from './errors.ts';

const handler: Operation.WithHandler<typeof RelayOperation.AssignChatParticipant> =
  RelayOperation.AssignChatParticipant.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat: chatRef, person: personRef }) {
        const chat = yield* Database.load(chatRef).pipe(Effect.orDie);
        const person = yield* Database.load(personRef).pipe(Effect.orDie);
        if (!Obj.instanceOf(Person.Person, person)) {
          return yield* Effect.fail(new AgentOperationError({ message: 'A chat participant must be a person.' }));
        }
        ChatParticipant.set(chat, person);
        return {};
      }),
    ),
  );

export default handler;
