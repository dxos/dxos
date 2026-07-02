//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { Message } from '@dxos/types';

import { FREEQ_BACKEND_KIND } from '../constants';
import { type ConnectionManager, FreeqRestApi, type IncomingMessage } from '../services';
import { FreeqChannel, makeFreeqChannel } from '../types';

/** Maps an inbound freeq/IRC message to a transient (non-persisted) chat message. */
export const toMessage = (incoming: IncomingMessage): Message.Message =>
  Message.make({
    sender: { name: incoming.nick },
    created: new Date(incoming.ts).toISOString(),
    blocks: [{ _tag: 'text', text: incoming.text }],
  });

const toMessageFromRest = (rest: FreeqRestApi.FreeqRestMessage): Message.Message => toMessage(rest);

/**
 * Live, read+write freeq channel backend. Joins an IRC channel over a shared
 * WebSocket, backfills recent history from the REST API, and streams inbound
 * PRIVMSGs. Messages are transient and de-duplicated by freeq message id.
 */
export const makeFreeqChannelBackend = (manager: ConnectionManager): ThreadCapabilities.ChannelBackendProvider => ({
  kind: FREEQ_BACKEND_KIND,
  label: 'Freeq',
  icon: 'ph--dog--regular',
  createFields: Schema.Struct({
    serverUrl: Schema.String.annotations({ title: 'Server URL', description: 'freeq WebSocket URL (wss://…).' }),
    channel: Schema.String.annotations({ title: 'Channel', description: 'IRC channel name (e.g. #general).' }),
    handle: Schema.optional(
      Schema.String.annotations({ title: 'Handle', description: 'Bluesky handle for authentication (optional).' }),
    ),
  }),
  makeConfig: (options) =>
    makeFreeqChannel({
      serverUrl: String(options.serverUrl ?? ''),
      channel: String(options.channel ?? ''),
      handle: options.handle ? String(options.handle) : undefined,
    }),
  subscribe: (channel, onMessages) => {
    let cancelled = false;
    let release: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;
    // Ordered by insertion; keyed by freeq message id for dedup and stable identity.
    const byId = new Map<string, Message.Message>();
    const emit = () => !cancelled && onMessages([...byId.values()]);

    void channel.backend.config.load().then((config) => {
      if (cancelled || !Obj.instanceOf(FreeqChannel, config) || !config.serverUrl || !config.channel) {
        onMessages([]);
        return;
      }

      // Guest connection for now; Task 9 supplies credentials + nick from the identity.
      const acquired = manager.acquire({
        serverUrl: config.serverUrl,
        identityKey: config.handle ?? 'guest',
        nick: config.handle?.split('.')[0] ?? 'guest',
        runResponse: (effect) => effect.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise),
      });
      release = acquired.release;

      void acquired.connection.join(config.channel);
      unsubscribe = acquired.connection.onMessage(config.channel, (incoming) => {
        byId.set(incoming.id, toMessage(incoming));
        emit();
      });

      // Backfill history (best-effort; live messages win on id collision).
      void FreeqRestApi.getMessages({
        httpBase: FreeqRestApi.httpBaseFromWs(config.serverUrl),
        channel: config.channel,
      })
        .pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise)
        .then((history) => {
          if (cancelled) {
            return;
          }
          for (const rest of history) {
            if (!byId.has(rest.id)) {
              byId.set(rest.id, toMessageFromRest(rest));
            }
          }
          emit();
        })
        .catch(() => emit());
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      release?.();
    };
  },
  send: (channel, message) =>
    Effect.gen(function* () {
      const config = yield* Effect.promise(() => channel.backend.config.load());
      if (!Obj.instanceOf(FreeqChannel, config)) {
        return;
      }
      const acquired = manager.acquire({
        serverUrl: config.serverUrl,
        identityKey: config.handle ?? 'guest',
        nick: config.handle?.split('.')[0] ?? 'guest',
        runResponse: (effect) => effect.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise),
      });
      const text = message.blocks.find((block) => block._tag === 'text')?.text ?? '';
      acquired.connection.sendMessage(config.channel, text);
      acquired.release();
    }),
  readOnly: (channel) => Obj.getMeta(channel).keys.length > 0,
});
