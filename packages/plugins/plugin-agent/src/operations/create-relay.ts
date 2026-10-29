//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Channel, Person, TaskSet } from '@dxos/types';

import { AgentChannels, Relay, RelayOperation } from '#types';

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
      const { replyChannel, replyThread } = yield* currentConversation;
      const taskSet = yield* ensureAgentTaskSet(agent);
      const title = `Tell ${partyName(recipient)}: ${text}`;
      const task = TaskSet.addTask(
        db,
        taskSet,
        title.length > TITLE_LENGTH ? `${title.slice(0, TITLE_LENGTH - 1)}\u2026` : title,
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
          replyChannel,
          replyThread,
          message: text,
          dueAt: dueInHours !== undefined ? new Date(Date.now() + dueInHours * 3_600_000).toISOString() : undefined,
        }),
      );

      return { relay: Ref.make(relay), task: Ref.make(task) };
    }),
  ),
);

export default handler;

/**
 * The channel and thread of the conversation the agent is running in, so the report goes back where the requester
 * asked; read from the process rather than asked of the model, which only sees the channel's name.
 */
const currentConversation = Effect.gen(function* () {
  const { conversation } = yield* Process.currentEnvironment;
  const id = conversation ? entityIdOf(conversation) : undefined;
  if (!id) {
    return {};
  }
  const { db } = yield* Database.Service;
  // The environment names the conversation's chat (EDGE's agent turn) or its feed.
  const object = db.getObjectById(id);
  const chat = Obj.instanceOf(Chat.Chat, object)
    ? object
    : (yield* Database.query(Filter.type(Chat.Chat)).run.pipe(Effect.orDie)).find(
        (chat) => entityIdOf(chat.feed.uri) === id,
      );
  const where = chat && AgentChannels.conversationOf(chat);
  if (!where) {
    return {};
  }
  const channels = yield* Database.query(Filter.type(Channel.Channel)).run.pipe(Effect.orDie);
  const channel = channels.find((channel) => channel.id === where.channelId);
  return channel ? { replyChannel: Ref.make(channel), replyThread: where.thread } : {};
});

/** The object id a URI names, whatever its space qualification. */
const entityIdOf = (uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  return eid ? EID.getEntityId(eid) : undefined;
};
