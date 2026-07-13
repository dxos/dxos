//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, Common, spaceLayer } from '@dxos/cli-util';
import { Database, Filter, Query } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Message } from '@dxos/types';

const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;

  const [mailbox] = yield* Database.query(Filter.type(Mailbox.Mailbox)).run;
  if (!mailbox) {
    yield* Console.log('No mailbox found in the space.');
    return;
  }

  const feed = yield* Effect.promise(() => mailbox.feed.load());
  const messages = yield* Database.query(Query.select(Filter.type(Message.Message)).from(feed)).run;
  const subscriptions = Mailbox.deriveSubscriptions(messages).filter(
    (subscription) => !Mailbox.isFiltered(mailbox, { sender: { email: subscription.email } }),
  );

  if (json) {
    yield* Console.log(JSON.stringify(subscriptions, null, 2));
    return;
  }
  if (subscriptions.length === 0) {
    yield* Console.log('No bulk-mail subscriptions found.');
    return;
  }
  for (const subscription of subscriptions) {
    yield* Console.log(
      `${String(subscription.count).padStart(4)}  ${subscription.name ?? subscription.email}  <${subscription.email}>`,
    );
  }
  yield* Console.log(`\n${subscriptions.length} subscription${subscriptions.length === 1 ? '' : 's'}.`);
});

export const subscriptions = Command.make(
  'subscriptions',
  { spaceId: Common.spaceId.pipe(Options.optional) },
  handler,
).pipe(
  Command.withDescription('List bulk-mail subscriptions (senders with a List-Unsubscribe) in the space mailbox.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
