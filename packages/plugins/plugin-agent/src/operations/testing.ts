//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Feed } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import { Channel, Message } from '@dxos/types';

/** `Channel.backend.kind` of the {@link makeTestChannelBackend} channels. */
export const TEST_BACKEND_KIND = 'org.dxos.channel.backend.test';

/** `Channel.backend.kind` of a mirrored test backend, whose host posts what the agent appends to its chats. */
export const TEST_MIRRORED_BACKEND_KIND = 'org.dxos.channel.backend.test-mirrored';

/** `Channel.backend.kind` of a test backend whose DMs open on the first post, as Discord's bot opens them. */
export const TEST_PENDING_DM_BACKEND_KIND = 'org.dxos.channel.backend.test-pending-dm';

/** `Person.identities` label the test backend reaches people by, as Discord reads `discord`. */
export const TEST_HANDLE_LABEL = 'test';

export type TestPost = { channel: string; thread?: string; text: string };

class TestBackendRefusedError extends BaseError.extend('TestBackendRefusedError', 'The test backend refused.') {}

/**
 * A channel backend with every optional member, standing in for Discord: it records posts, opens a
 * direct thread `dm-<handle>` for people with a `test` identity, and refuses handles in `refuse`.
 * With `pendingDirect`, a direct thread is `pending-<handle>` until the first post, whose receipt names `dm-<handle>`.
 */
export const makeTestChannelBackend = ({
  refuse = [],
  mirrored = false,
  pendingDirect = false,
}: { refuse?: readonly string[]; mirrored?: boolean; pendingDirect?: boolean } = {}) => {
  const posts: TestPost[] = [];
  const post = (channel: Channel.Channel, requested: string | undefined, message: Message.Message) =>
    Effect.suspend(() => {
      const thread = requested?.replace(/^pending-/, 'dm-');
      if (thread !== undefined && refuse.some((handle) => thread === `dm-${handle}`)) {
        return Effect.fail(new TestBackendRefusedError({ message: 'Their direct messages are closed.' }));
      }
      posts.push({ channel: channel.id, thread, text: Message.extractText(message) });
      const messageId = `post-${posts.length}`;
      return Effect.succeed({
        ...(thread !== requested ? { thread } : {}),
        messageIds: [messageId],
        properties: { test: { messageId } },
      });
    });

  const provider: ThreadCapabilities.ChannelBackendProvider = {
    kind: mirrored ? TEST_MIRRORED_BACKEND_KIND : pendingDirect ? TEST_PENDING_DM_BACKEND_KIND : TEST_BACKEND_KIND,
    label: 'Test',
    mirrored,
    createFields: Schema.Struct({}),
    makeConfig: () => Feed.make(),
    subscribe: (_channel, onMessages) => {
      onMessages([]);
      return () => {};
    },
    send: (channel, message) => post(channel, undefined, message),
    openDirect: (_channel, person) => {
      const handle = person.identities?.find((identity) => identity.label === TEST_HANDLE_LABEL)?.value;
      return Effect.succeed(handle === undefined ? undefined : `${pendingDirect ? 'pending' : 'dm'}-${handle}`);
    },
    threads: { send: (channel, thread, message) => post(channel, thread, message) },
  };

  return { provider, posts };
};

/** A capability manager holding the given channel backends, as plugin-thread and backend plugins contribute them. */
export const makeChannelCapabilities = (...providers: ThreadCapabilities.ChannelBackendProvider[]) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  for (const provider of providers) {
    manager.contribute({
      interface: ThreadCapabilities.ChannelBackend,
      implementation: provider,
      module: provider.kind,
    });
  }
  return manager;
};

/** A channel on the test backend. */
export const makeTestChannel = (name = 'general', kind = TEST_BACKEND_KIND) =>
  Channel.make({ name, backend: { kind, config: Feed.make() } });
