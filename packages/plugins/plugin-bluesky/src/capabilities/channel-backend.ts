//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { Message } from '@dxos/types';

import { ATPROTO_BACKEND_KIND, ATPROTO_POLL_INTERVAL } from '../constants';
import { BlueskyApi } from '../services';
import { BlueskyChannel, makeBlueskyChannel } from '../types';

/** Maps an ATProto feed-view post to a transient (non-persisted) chat message. */
const toMessage = (item: BlueskyApi.FeedViewPost): Message.Message =>
  Message.make({
    sender: { name: item.post.author.displayName ?? item.post.author.handle },
    created: item.post.record.createdAt,
    blocks: [{ _tag: 'text', text: item.post.record.text ?? '' }],
  });

/**
 * Read-only ATProto channel backend. Displays a public author feed via the
 * Bluesky public AppView (no auth) by polling `getAuthorFeed` and mapping posts
 * to chat messages. Sends are unsupported; the channel renders read-only.
 */
export const blueskyChannelBackend: ThreadCapabilities.ChannelBackendProvider = {
  kind: ATPROTO_BACKEND_KIND,
  label: 'Bluesky',
  icon: 'ph--butterfly--regular',
  createFields: Schema.Struct({
    handle: Schema.String.annotations({ title: 'Handle', description: 'Public Bluesky handle (e.g., bsky.app.)' }),
  }),
  makeConfig: (options) => makeBlueskyChannel(String(options.handle ?? '')),
  subscribe: (channel, onMessages) => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    // Cache messages by post uri so identity is stable across polls (avoids list churn).
    const cache = new Map<string, Message.Message>();

    void channel.backend.config
      .load()
      .then((config) => {
        if (cancelled) {
          return;
        }
        if (!Obj.instanceOf(BlueskyChannel, config) || !config.handle) {
          onMessages([]);
          return;
        }

        const handle = config.handle;
        // Skip a tick if the previous request is still in flight (avoids overlap / out-of-order updates).
        let inFlight = false;
        const poll = () => {
          if (inFlight) {
            return;
          }
          inFlight = true;
          void BlueskyApi.getAuthorFeed({ actor: handle })
            .pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise)
            .then((response) => {
              if (cancelled) {
                return;
              }
              // Author feed is newest-first; reverse so the newest renders at the bottom.
              const messages = [...response.feed].reverse().map((item) => {
                const existing = cache.get(item.post.uri);
                if (existing) {
                  return existing;
                }
                const message = toMessage(item);
                cache.set(item.post.uri, message);
                return message;
              });
              onMessages(messages);
            })
            // Transient network/5xx/timeout failures are already retried inside
            // getAuthorFeed. If the very first fetch fails (nothing cached yet),
            // emit an empty list so the channel leaves the loading state; later
            // failures keep the last rendered list.
            .catch(() => {
              if (!cancelled && cache.size === 0) {
                onMessages([]);
              }
            })
            .finally(() => {
              inFlight = false;
            });
        };

        poll();
        timer = setInterval(poll, ATPROTO_POLL_INTERVAL);
      })
      // If the config ref can't be loaded (deleted/invalid/permission), satisfy the
      // subscribe contract with an empty list rather than leaving the UI loading forever.
      .catch(() => {
        if (!cancelled) {
          onMessages([]);
        }
      });

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  },
  send: () => Effect.fail(new Error('Bluesky channels are read-only.')),
  readOnly: () => true,
};

/** Contributes the read-only ATProto channel backend. */
export const ChannelBackend = Capability.makeModule<ThreadCapabilities.ChannelBackendProvider>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ThreadCapabilities.ChannelBackend, blueskyChannelBackend);
  }),
);

export default ChannelBackend;
