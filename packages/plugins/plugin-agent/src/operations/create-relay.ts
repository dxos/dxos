//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { Person, TaskSet } from '@dxos/types';

import { Relay, RelayOperation } from '#types';

import { AgentOperationError } from './errors.ts';
import { asParty, ensureAgentTaskSet, partyName } from './relay.ts';

/** A task title is read in a list, so the message is cut to a glanceable length there. */
const TITLE_LENGTH = 80;

const handler: Operation.WithHandler<typeof RelayOperation.CreateRelay> = RelayOperation.CreateRelay.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      agent: agentRef,
      recipient: recipientRef,
      requester: requesterRef,
      message,
      replyChannelId,
      dueInHours,
    }) {
      const text = message.trim();
      if (text.length === 0) {
        return yield* Effect.fail(new AgentOperationError({ message: 'The relay needs a message.' }));
      }

      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const recipient = yield* asParty(yield* Database.load(recipientRef).pipe(Effect.orDie));
      const requesterObject = requesterRef ? yield* Database.load(requesterRef).pipe(Effect.orDie) : undefined;
      if (requesterObject !== undefined && !Obj.instanceOf(Person.Person, requesterObject)) {
        return yield* Effect.fail(
          new AgentOperationError({ message: 'The requester must be a person; resolve them first.' }),
        );
      }

      const { db } = yield* Database.Service;
      const taskSet = yield* ensureAgentTaskSet(agent);
      const title = `Tell ${partyName(recipient)}: ${text}`;
      const task = TaskSet.addTask(
        db,
        taskSet,
        title.length > TITLE_LENGTH ? `${title.slice(0, TITLE_LENGTH - 1)}…` : title,
        {
          description: text,
          assignee: { role: 'assistant', name: agent.name, subject: Ref.make(agent) },
        },
      );

      const relay = yield* Database.add(
        Relay.make({
          agent,
          task: Ref.make(task),
          recipient: Ref.make(recipient),
          requester: requesterObject ? Ref.make(requesterObject) : undefined,
          replyChannelId,
          message: text,
          dueAt: dueInHours !== undefined ? new Date(Date.now() + dueInHours * 3_600_000).toISOString() : undefined,
        }),
      );

      return { relay: Ref.make(relay), task: Ref.make(task) };
    }),
  ),
);

export default handler;
