//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterAll, afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Query, Ref, Scope, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type Connection, type Cursor } from '@dxos/link';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { seedMailboxBinding } from '@dxos/plugin-inbox/testing/sync';
import { Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { GMAIL_CONNECTOR_ID, GMAIL_SOURCE } from '../../../constants.ts';
import {
  LIVE_GMAIL_ACCOUNT,
  hasLiveGmailCredentials,
  liveGmailAccessToken,
} from '../../../testing/live-credentials.ts';
import { googleSyncLiveServices, runGoogleSync } from '../../../testing/sync-fixture.ts';

/**
 * Bidirectional tag sync against a REAL Gmail account — the one layer the mock cannot answer, because
 * what is being tested is Gmail's actual behaviour rather than our model of it.
 *
 * Skipped unless `.secrets/` holds credentials (see `TESTING.md`). It WRITES labels, so it asserts the
 * account identity before its first write and restores every label it touched in a `finally`.
 */

const describeLive = hasLiveGmailCredentials() ? describe : describe.skip;

describeLive('gmail tag sync (live)', { timeout: 120_000 }, () => {
  let builder: EchoTestBuilder;
  let accessToken: string;

  /** Original labels of every message the run touched, restored after each test. */
  const touched = new Map<string, readonly string[]>();

  beforeEach(async () => {
    accessToken = liveGmailAccessToken();
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Direct Gmail calls for arranging and asserting, independent of the sync path under test. */
  const gmail = async (path: string, init?: { method: string; body: unknown }) => {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init ? JSON.stringify(init.body) : undefined,
    });
    if (response.status === 204) {
      return {};
    }
    const json = await response.json();
    if (!response.ok) {
      throw new Error(`gmail ${path} → ${response.status}: ${JSON.stringify(json)}`);
    }
    return json;
  };

  const labelsOf = async (id: string): Promise<readonly string[]> => {
    const message = await gmail(`/messages/${id}?format=minimal`);
    return message.labelIds ?? [];
  };

  const remember = async (id: string) => {
    if (!touched.has(id)) {
      touched.set(id, await labelsOf(id));
    }
  };

  afterAll(async () => {
    // Restore every touched message, loudly. A shared account means a swallowed failure here leaves a
    // colleague's mailbox modified.
    const failures: string[] = [];
    for (const [id, original] of touched) {
      try {
        const current = await labelsOf(id);
        const addLabelIds = original.filter((label) => !current.includes(label));
        const removeLabelIds = current.filter((label) => !original.includes(label));
        if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
          await gmail(`/messages/${id}/modify`, { method: 'POST', body: { addLabelIds, removeLabelIds } });
        }
      } catch (error) {
        failures.push(`${id}: ${String(error)}`);
      }
    }
    touched.clear();
    if (failures.length > 0) {
      throw new Error(`live tag-sync cleanup failed, ${LIVE_GMAIL_ACCOUNT} left modified:\n${failures.join('\n')}`);
    }
  });

  const seed = async () => {
    const { db, mailbox, connection, binding } = await seedMailboxBinding(builder, {
      source: GMAIL_SOURCE,
      connectorId: GMAIL_CONNECTOR_ID,
      token: accessToken,
      options: { syncBackDays: 30 },
    });
    return { db, mailbox, connection, binding };
  };

  const sync = (db: Database.Database, connection: Connection.Connection, binding: Cursor.Cursor) =>
    EffectEx.runPromise(
      runGoogleSync({ binding: Ref.make(binding) }).pipe(
        Effect.provide(googleSyncLiveServices(db, Ref.make(connection))),
      ),
    );

  const feedMessages = async (db: Database.Database, feed: Feed.Feed) =>
    db.query(Query.select(Filter.type(Message.Message)).from(Scope.feed(Feed.getFeedUri(feed)!))).run();

  const gmailIdOf = (message: Obj.Any): string =>
    Obj.getMeta(message).keys.find((key) => key.source === GMAIL_SOURCE)!.id;

  test('the token points at the expected account', async ({ expect }) => {
    const profile = await gmail('/profile');
    // Fails rather than skips: a mis-pointed token must be loud, not quietly write to another mailbox.
    expect(profile.emailAddress).toBe(LIVE_GMAIL_ACCOUNT);
  });

  test('a locally applied star reaches Gmail, and a Gmail label reaches the tag index', async ({ expect }) => {
    const { db, mailbox, connection, binding } = await seed();

    // Run 1 — pull real mail and record the reconciliation base.
    const first = await sync(db, connection, binding);
    expect(first.newMessages).toBeGreaterThan(0);

    const messages = await feedMessages(db, mailbox.feed.target!);
    expect(messages.length).toBeGreaterThan(1);
    const [local, remote] = messages;
    const localGmailId = gmailIdOf(local);
    const remoteGmailId = gmailIdOf(remote);
    await remember(localGmailId);
    await remember(remoteGmailId);

    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));

    // Local → provider: star one message in the tag index.
    const starred = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('starred'), label: 'Starred' });
    const starredUri = Obj.getURI(starred).toString();
    Tagging.set(local, starredUri, { index: tagIndex });

    // Provider → local: label a different message at Gmail directly.
    await gmail(`/messages/${remoteGmailId}/modify`, { method: 'POST', body: { addLabelIds: ['IMPORTANT'] } });
    await db.flush({ indexes: true });

    // Run 2 — pushes the star, pulls the label.
    await sync(db, connection, binding);

    expect(await labelsOf(localGmailId)).toContain('STARRED');

    const important = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('important'), label: 'Important' });
    expect(TagIndex.bind(tagIndex).tags(remote.id)).toContain(Obj.getURI(important).toString());
  });

  test('archiving locally removes INBOX at Gmail', async ({ expect }) => {
    const { db, mailbox, connection, binding } = await seed();
    await sync(db, connection, binding);

    const messages = await feedMessages(db, mailbox.feed.target!);
    const tagIndex = await EffectEx.runPromise(Database.load(mailbox.tags).pipe(Effect.provide(Database.layer(db))));
    const inbox = await Tag.findOrCreate(db, { key: SystemTags.systemTagKey('inbox'), label: 'Inbox' });
    const inboxUri = Obj.getURI(inbox).toString();

    const target = messages.find((message) => TagIndex.bind(tagIndex).tags(message.id).includes(inboxUri));
    expect(target, 'no synced message carries the inbox tag').toBeDefined();
    const gmailId = gmailIdOf(target!);
    await remember(gmailId);

    Tagging.unset(target!, inboxUri, { index: tagIndex });
    await db.flush({ indexes: true });

    await sync(db, connection, binding);
    expect(await labelsOf(gmailId)).not.toContain('INBOX');
  });
});
