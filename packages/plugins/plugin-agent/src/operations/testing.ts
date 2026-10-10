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

/** `Person.identities` label the test backend reaches people by, as Discord reads `discord`. */
export const TEST_HANDLE_LABEL = 'test';

export type TestPost = { channel: string; thread?: string; text: string };

class TestBackendRefusedError extends BaseError.extend('TestBackendRefusedError', 'The test backend refused.') {}

/**
 * A channel backend with every optional member, standing in for Discord: it records posts, opens a
 * direct thread `dm-<handle>` for people with a `test` identity, and refuses handles in `refuse`.
 */
export const makeTestChannelBackend = ({ refuse = [] }: { refuse?: readonly string[] } = {}) => {
  const posts: TestPost[] = [];
  const post = (channel: Channel.Channel, thread: string | undefined, message: Message.Message) =>
    Effect.suspend(() => {
      if (thread !== undefined && refuse.some((handle) => thread === `dm-${handle}`)) {
        return Effect.fail(new TestBackendRefusedError({ message: 'Their direct messages are closed.' }));
      }
      posts.push({ channel: channel.id, thread, text: Message.extractText(message) });
      const messageId = `post-${posts.length}`;
      return Effect.succeed({ messageIds: [messageId], properties: { test: { messageId } } });
    });

  const provider: ThreadCapabilities.ChannelBackendProvider = {
    kind: TEST_BACKEND_KIND,
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
      return Effect.succeed(handle === undefined ? undefined : `dm-${handle}`);
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
export const makeTestChannel = (name = 'general') =>
  Channel.make({ name, backend: { kind: TEST_BACKEND_KIND, config: Feed.make() } });
