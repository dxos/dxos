//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import * as ChannelBackend from '@dxos/plugin-thread/ChannelBackend';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { Channel, Message } from '@dxos/types';

/** `Channel.backend.kind` of the {@link makeTestChannelBackend} channels. */
export const TEST_BACKEND_KIND = 'org.dxos.channel.backend.test';

/** `Channel.backend.kind` of a test backend whose DMs open on the first post, as Discord's bot opens them. */
export const TEST_PENDING_DM_BACKEND_KIND = 'org.dxos.channel.backend.test-pending-dm';

/** `Channel.backend.kind` of a test backend reached only through its operations, as plugin-discord's is on EDGE. */
export const TEST_OPERATION_BACKEND_KIND = 'org.dxos.channel.backend.test-operation';

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
  pendingDirect = false,
  kind = pendingDirect ? TEST_PENDING_DM_BACKEND_KIND : TEST_BACKEND_KIND,
}: { refuse?: readonly string[]; pendingDirect?: boolean; kind?: string } = {}) => {
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
    kind,
    label: 'Test',
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

/**
 * Handlers for a backend's own operations, as its plugin registers them where plugin-thread cannot see its capability.
 */
export const makeBackendOperationHandlers = (provider: ThreadCapabilities.ChannelBackendProvider) => {
  const { Send, OpenDirect } = ThreadOperation.backendOperations(provider.kind);
  const send: Operation.WithHandler<typeof Send> = Send.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, thread, text }) {
        return yield* ChannelBackend.sendThrough(provider, yield* Database.load(channel), thread, text);
      }),
    ),
  );
  const openDirect: Operation.WithHandler<typeof OpenDirect> = OpenDirect.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, person }) {
        const loaded = yield* Database.load(channel);
        return yield* ChannelBackend.openDirectThrough(provider, loaded, yield* Database.load(person));
      }),
    ),
  );
  return OperationHandlerSet.make(send, openDirect);
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
