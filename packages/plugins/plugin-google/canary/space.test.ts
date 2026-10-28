//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Feed, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as MailSync from '@dxos/plugin-inbox/MailSync';
import { Message } from '@dxos/types';

import { GoogleOperation } from '#types';

import { GMAIL_SOURCE } from '../src/constants.ts';
import { readSnapshot } from './space.ts';

const KEY = GoogleOperation.GoogleMailSync.meta.key;

describe('readSnapshot', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('reads keyed mailbox messages, mail sync invocations and the remote timer trigger', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Trace.Message, Trigger.Trigger],
    });
    const mailbox = db.add(Mailbox.make());
    const traceFeed = db.add(Feed.make({ kind: FeedTraceSink.TRACE_FEED_KIND }));
    db.add(Trigger.make({ spec: Trigger.specTimer(MailSync.MAIL_SYNC_CRON), remote: true, enabled: true }));
    db.add(Trigger.make({ spec: Trigger.specTimer('0 * * * *'), enabled: true }));
    await db.flush();

    const message = (gmailId: string | undefined, subject: string) =>
      Obj.make(Message.Message, {
        [Obj.Meta]: { keys: gmailId ? [{ source: GMAIL_SOURCE, id: gmailId }] : [] },
        created: new Date().toISOString(),
        sender: { email: 'phillip.allen@enron.com' },
        blocks: [],
        properties: { subject },
      });
    const trace = (pid: string, type: string, timestamp: number, data: object) =>
      Obj.make(Trace.Message, { meta: { pid }, isEphemeral: false, events: [{ type, timestamp, data }] });

    const mailboxFeed = mailbox.feed?.target;
    invariant(mailboxFeed, 'mailbox has no feed');

    const snapshot = await EffectEx.runAndForwardErrors(
      Effect.gen(function* () {
        yield* Feed.append(mailboxFeed, [message('g1', 'Re: forecast'), message(undefined, 'draft')]);
        yield* Feed.append(traceFeed, [
          trace('run-1', Trace.OperationStart.key, 10, { key: KEY }),
          trace('run-1', Trace.OperationEnd.key, 20, { key: KEY, outcome: 'success' }),
          trace('other', Trace.OperationStart.key, 15, { key: 'dxn:org.dxos.operation.other' }),
        ]);
        return yield* readSnapshot();
      }).pipe(Effect.provide(Database.layer(db))),
    );

    expect(snapshot.messages).toEqual([{ gmailId: 'g1', subject: 'Re: forecast', sender: 'phillip.allen@enron.com' }]);
    expect(snapshot.invocations).toEqual([
      { pid: 'run-1', runId: 'run-1', startedAt: 10, end: { key: KEY, outcome: 'success', timestamp: 20 } },
    ]);
    expect(snapshot.triggers).toEqual([{ id: expect.any(String), enabled: true }]);
  });
});
