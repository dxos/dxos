//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Registry from 'effect/reactivity/AtomRegistry';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';
import { Channel, Message, Person } from '@dxos/types';

import { SlackChannel } from '#types';

import { SLACK_SCOPES, SLACK_SOURCE } from '../constants.ts';
import { appendToMirror, getMessageTs } from '../mirror.ts';
import { findOrCreateChannelForTarget } from '../operations/sync.ts';
import { slackChannelBackend } from './channel-backend.ts';

type Call = { method: string; params: Record<string, string> };

/** Reads the form-encoded body Slack calls carry, whichever shape the fetch client hands over. */
const readParams = async (input: string | URL | Request, init?: RequestInit): Promise<Record<string, string>> => {
  const body = input instanceof Request ? await input.text() : init?.body;
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body);
  }
  if (body instanceof Uint8Array) {
    return Object.fromEntries(new URLSearchParams(new TextDecoder().decode(body)));
  }
  return Object.fromEntries(new URLSearchParams(typeof body === 'string' ? body : ''));
};

/** A fake Slack Web API: answers `chat.postMessage` and `conversations.open`, or a scripted `ok: false`. */
const fakeSlack = (options: { error?: string } = {}) => {
  const calls: Call[] = [];
  let next = 0;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = url.split('/').at(-1) ?? '';
    const params = await readParams(input, init);
    calls.push({ method, params });
    if (options.error) {
      return Response.json({ ok: false, error: options.error });
    }
    if (method === 'conversations.open') {
      return Response.json({ ok: true, channel: { id: 'D-dm' } });
    }
    next++;
    return Response.json({ ok: true, channel: params.channel, ts: `1700000000.00000${next}` });
  };
  return { calls, fetch };
};

const testLayer = () =>
  TestDatabaseLayer({
    types: [
      Channel.Channel,
      SlackChannel.SlackChannel,
      AccessToken.AccessToken,
      Feed.Feed,
      Message.Message,
      Person.Person,
    ],
  });

const withCapabilities = Effect.provideService(
  Capability.Service,
  CapabilityManager.make({ registry: Registry.make() }),
);

/** A Slack-backed channel on conversation `C1`, created the way materializing a sync target does. */
const makeChannel = (scopes: readonly string[] = SLACK_SCOPES) =>
  Effect.gen(function* () {
    const accessToken = yield* Database.add(
      AccessToken.make({ source: SLACK_SOURCE, token: 'xoxb-secret', scopes: [...scopes] }),
    );
    const channel = yield* findOrCreateChannelForTarget({
      externalId: 'C1',
      name: '#general',
      accessToken: Ref.make(accessToken),
    });
    yield* Database.flush();
    const config = yield* Database.load(channel.backend.config);
    if (!SlackChannel.instanceOf(config)) {
      return yield* Effect.die('Expected a Slack channel config.');
    }
    const feed = yield* Database.load(config.feed);
    yield* Database.load(config.accessToken);
    return { channel, config, feed };
  });

const text = (value: string) =>
  Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: value }] });

const mirrored = (feed: Feed.Feed) =>
  Effect.map(Feed.query(feed, Filter.type(Message.Message)).run, (messages) =>
    messages.map((message) => ({
      ts: getMessageTs(message),
      text: Message.extractText(message),
      thread: message.threadId,
    })),
  );

describe('Slack channel backend', () => {
  it.effect('posts as the bot into the conversation and mirrors the post by its ts', () =>
    Effect.gen(function* () {
      const slack = fakeSlack();
      const { channel, feed } = yield* makeChannel();
      expect(channel.backend.kind).toBe(SlackChannel.BACKEND_KIND);

      const receipt = yield* slackChannelBackend
        .send(channel, text('hello'))
        .pipe(withCapabilities, Effect.provideService(FetchHttpClient.Fetch, slack.fetch));
      expect(receipt).toEqual({
        messageIds: ['1700000000.000001'],
        properties: { slack: { channel: 'C1', ts: '1700000000.000001', threadTs: undefined } },
      });
      expect(slack.calls).toEqual([
        { method: 'chat.postMessage', params: { token: 'xoxb-secret', channel: 'C1', text: 'hello' } },
      ]);
      expect(yield* mirrored(feed)).toEqual([{ ts: '1700000000.000001', text: 'hello', thread: undefined }]);
      // The article never posts as the bot, even with chat:write.
      expect(slackChannelBackend.readOnly?.(channel)).toBe(true);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('replies in a thread by its ts', () =>
    Effect.gen(function* () {
      const slack = fakeSlack();
      const { channel, feed } = yield* makeChannel();
      yield* (slackChannelBackend.threads?.send(channel, '1699999999.000100', text('reply')) ?? Effect.void).pipe(
        withCapabilities,
        Effect.provideService(FetchHttpClient.Fetch, slack.fetch),
      );
      expect(slack.calls[0].params).toEqual({
        token: 'xoxb-secret',
        channel: 'C1',
        text: 'reply',
        thread_ts: '1699999999.000100',
      });
      expect(yield* mirrored(feed)).toEqual([{ ts: '1700000000.000001', text: 'reply', thread: '1699999999.000100' }]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('opens a DM from the slack identity and posts into it without mirroring', () =>
    Effect.gen(function* () {
      const slack = fakeSlack();
      const { channel, feed } = yield* makeChannel();
      const run = <A, E>(effect: Effect.Effect<A, E, Capability.Service>) =>
        effect.pipe(withCapabilities, Effect.provideService(FetchHttpClient.Fetch, slack.fetch));

      const nobody = Person.make({ fullName: 'Nobody' });
      expect(
        yield* run(slackChannelBackend.openDirect?.(channel, nobody) ?? Effect.succeed(undefined)),
      ).toBeUndefined();
      expect(slack.calls).toHaveLength(0);

      const ada = Person.make({ fullName: 'Ada', identities: [{ label: 'slack', value: 'U7' }] });
      const thread = yield* run(slackChannelBackend.openDirect?.(channel, ada) ?? Effect.succeed(undefined));
      expect(thread).toBe('D-dm');
      yield* run(slackChannelBackend.threads?.send(channel, 'D-dm', text('hi Ada')) ?? Effect.void);

      expect(slack.calls).toEqual([
        { method: 'conversations.open', params: { token: 'xoxb-secret', users: 'U7' } },
        { method: 'chat.postMessage', params: { token: 'xoxb-secret', channel: 'D-dm', text: 'hi Ada' } },
      ]);
      expect(yield* mirrored(feed)).toEqual([]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('fails with an actionable reason on missing_scope', () =>
    Effect.gen(function* () {
      const slack = fakeSlack({ error: 'missing_scope' });
      const { channel, feed } = yield* makeChannel(['channels:read', 'channels:history']);
      expect(slackChannelBackend.readOnly?.(channel)).toBe(true);

      const exit = yield* slackChannelBackend
        .send(channel, text('hello'))
        .pipe(withCapabilities, Effect.provideService(FetchHttpClient.Fetch, slack.fetch), Effect.exit);
      expect(Exit.isFailure(exit) ? String(exit.cause) : undefined).toContain('reconnect Slack');
      expect(yield* mirrored(feed)).toEqual([]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a sync does not re-append a message the backend already posted', () =>
    Effect.gen(function* () {
      const slack = fakeSlack();
      const { channel, feed } = yield* makeChannel();
      yield* slackChannelBackend
        .send(channel, text('hello'))
        .pipe(withCapabilities, Effect.provideService(FetchHttpClient.Fetch, slack.fetch));

      const fromHistory = (ts: string, value: string) =>
        Message.make({
          [Obj.Meta]: { keys: [{ source: SLACK_SOURCE, id: ts }] },
          sender: { role: 'user', name: 'bot' },
          blocks: [{ _tag: 'text', text: value }],
        });
      const appended = yield* appendToMirror(feed, [
        fromHistory('1700000000.000001', 'hello'),
        fromHistory('1700000000.000009', 'new'),
      ]);
      expect(appended.map(getMessageTs)).toEqual(['1700000000.000009']);
      expect((yield* mirrored(feed)).map(({ ts }) => ts)).toEqual(['1700000000.000001', '1700000000.000009']);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('Slack channel migration', () => {
  it.effect('moves a feed-backed Slack channel onto the Slack backend, keeping its feed, idempotently', () =>
    Effect.gen(function* () {
      const accessToken = Ref.make(
        yield* Database.add(AccessToken.make({ source: SLACK_SOURCE, token: 'xoxb-secret' })),
      );
      const legacy = yield* Database.add(
        Channel.make({ [Obj.Meta]: { keys: [{ source: SLACK_SOURCE, id: 'C1' }] }, name: '#general' }),
      );
      const legacyFeed = yield* Database.load(legacy.backend.config);
      expect(legacy.backend.kind).toBe(Channel.FeedBackendKind);

      const channel = yield* findOrCreateChannelForTarget({ externalId: 'C1', accessToken });
      expect(channel.id).toBe(legacy.id);
      expect(channel.backend.kind).toBe(SlackChannel.BACKEND_KIND);
      const config = yield* Database.load(channel.backend.config);
      expect(SlackChannel.instanceOf(config)).toBe(true);
      if (!SlackChannel.instanceOf(config)) {
        return;
      }
      expect(config.conversationId).toBe('C1');
      expect((yield* Database.load(config.feed)).id).toBe(legacyFeed.id);

      const again = yield* findOrCreateChannelForTarget({ externalId: 'C1', accessToken });
      expect(again.id).toBe(legacy.id);
      expect((yield* Database.load(again.backend.config)).id).toBe(config.id);
    }).pipe(Effect.provide(testLayer())),
  );
});
