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

import { FREEQ_BACKEND_KIND } from '../constants';
import * as FreeqCapabilities from '../FreeqCapabilities';
import { ConnectionManager, FreeqRestApi, type IncomingMessage, makeAppPasswordCredentialProvider } from '../services';
import { FreeqChannel, makeFreeqChannel } from '../types';

/** Resolves stored credentials for a handle, or `undefined` for a guest (read-only) connection. */
export type LookupCredential = (handle: string) => { appPassword: string } | undefined;

/** Maps an inbound freeq/IRC message to a transient (non-persisted) chat message. */
export const toMessage = (incoming: IncomingMessage): Message.Message =>
  Message.make({
    sender: { name: incoming.nick },
    created: new Date(incoming.ts).toISOString(),
    blocks: [{ _tag: 'text', text: incoming.text }],
  });

const toMessageFromRest = (rest: FreeqRestApi.FreeqRestMessage): Message.Message => toMessage(rest);

/** Builds the `manager.acquire` params for a channel config, resolving credentials when a handle is present. */
const acquireParamsFor = (
  config: FreeqChannel,
  lookupCredential: LookupCredential | undefined,
): Parameters<ConnectionManager['acquire']>[0] => {
  const handle = config.handle;
  const credential = handle ? lookupCredential?.(handle) : undefined;
  return {
    serverUrl: config.serverUrl,
    identityKey: handle ?? 'guest',
    nick: handle?.split('.')[0] ?? 'guest',
    credentialProvider:
      handle && credential
        ? makeAppPasswordCredentialProvider({ handle, appPassword: credential.appPassword })
        : undefined,
    runResponse: (effect) => effect.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise),
  };
};

/**
 * Live, read+write freeq channel backend. Joins an IRC channel over a shared
 * WebSocket, backfills recent history from the REST API, and streams inbound
 * PRIVMSGs. Messages are transient and de-duplicated by freeq message id.
 */
export const makeFreeqChannelBackend = (
  manager: ConnectionManager,
  lookupCredential?: LookupCredential,
): ThreadCapabilities.ChannelBackendProvider => ({
  kind: FREEQ_BACKEND_KIND,
  label: 'Freeq',
  icon: 'ph--dog--regular',
  createFields: Schema.Struct({
    serverUrl: Schema.String.annotations({
      title: 'Server URL',
      description: 'freeq WebSocket URL, e.g. wss://irc.freeq.at/irc',
    }),
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

    void channel.backend.config
      .load()
      .then((config) => {
        if (cancelled || !Obj.instanceOf(FreeqChannel, config) || !config.serverUrl || !config.channel) {
          onMessages([]);
          return;
        }

        const acquired = manager.acquire(acquireParamsFor(config, lookupCredential));
        release = acquired.release;

        void acquired.connection.join(config.channel).catch(() => {});
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
      })
      .catch(() => onMessages([]));

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
      const acquired = manager.acquire(acquireParamsFor(config, lookupCredential));
      const text = message.blocks.find((block) => block._tag === 'text')?.text ?? '';
      // Must await the line actually reaching the transport before releasing: a fresh
      // connection's socket closes as soon as the last handle releases, which would drop
      // a still-buffered (pre-registration) message.
      yield* Effect.promise(() => acquired.connection.sendMessage(config.channel, text));
      acquired.release();
    }),
  readOnly: (channel) => Obj.getMeta(channel).keys.length > 0,
});

/**
 * Contributes the shared connection manager and the live freeq channel backend from a single
 * module. Sibling Startup modules activate concurrently and only contribute once the whole wave
 * has activated, so splitting these across two modules (with the backend `waitFor`-ing the manager)
 * deadlocks activation; co-locating them removes the cross-module dependency.
 */
export const ChannelBackend = Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = new ConnectionManager();
    // TODO(Task 11): supply lookupCredential from stored AccessToken once server auth shapes are confirmed.
    return [
      Capability.contributes(FreeqCapabilities.ConnectionManager, manager),
      Capability.contributes(ThreadCapabilities.ChannelBackend, makeFreeqChannelBackend(manager)),
    ];
  }),
);

export default ChannelBackend;
