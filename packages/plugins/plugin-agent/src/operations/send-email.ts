//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query } from '@dxos/echo';
import { Person } from '@dxos/types';

import { AgentChannels, AgentEmail, AgentMailbox, EmailOperation } from '#types';

const handler: Operation.WithHandler<typeof EmailOperation.Send> = EmailOperation.Send.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, to, subject, text, thread }) {
      const agent = yield* Database.load(agentRef);
      const { db } = yield* Database.Service;
      const handle = yield* mailboxHandle(agent);
      const recipient = to.trim().toLowerCase();
      const people = yield* Database.query(Query.select(Filter.type(Person.Person))).run;
      const contact = people.some((person) =>
        (person.emails ?? []).some(({ value }) => value.trim().toLowerCase() === recipient),
      );
      const mailbox = yield* AgentMailbox.AgentMailboxService;
      const sent = yield* mailbox.send({
        handle,
        spaceId: db.spaceId,
        to: recipient,
        subject,
        text,
        thread,
        correspondentOnly: !contact,
      });
      return { message: sent.messageId, thread: sent.thread };
    }, Effect.orDie),
  ),
);

/** The handle of the agent's email channel: the one EDGE holds, else the configured one. */
const mailboxHandle = Effect.fnUntraced(function* (agent: Agent.Agent) {
  for (const channel of yield* AgentChannels.loadChannels(agent)) {
    if (channel.backend.kind !== AgentEmail.BACKEND_KIND) {
      continue;
    }
    const config = yield* Database.load(channel.backend.config).pipe(Effect.orElseSucceed(() => undefined));
    if (AgentEmail.instanceOf(config)) {
      return config.claimedHandle ?? config.handle;
    }
  }
  return yield* Effect.fail(new AgentMailbox.AgentMailboxError({ message: 'The agent has no email address.' }));
});

export default handler;
