//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Chat from '@dxos/assistant/Chat';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

const CHAT_UNREAD = 'New reply from the assistant';
const COMPANION_UNREAD = 'The assistant finished work on this';

/** Long enough for a member's open view to record the turn, so a chat someone is reading never flashes unread. */
const GRACE_MS = 2_000;

/** The unread monitor on an object, keyed `<uri>#<suffix>` so the object's navtree row finds it. */
const unreadKey = (object: Obj.Unknown) => `${Obj.getURI(object, { prefer: 'absolute' }).toString()}#unread`;

/**
 * Reports each unread chat ({@link Chat.isUnread}) to the progress registry as a done monitor, on the chat and, for a
 * companion chat, on the object it accompanies. A chat shows only once it has stayed unread for {@link GRACE_MS}.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const progressOption = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(progressOption)) {
      return [];
    }
    const progress = progressOption.value;

    // Chats with finished turns, by space; each is watched, since a query does not fire on property changes.
    const chats = new Map<SpaceId, Map<string, { chat: Chat.Chat; unsubscribe: () => void }>>();
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    const shown = new Map<string, Chat.Chat>();
    const monitors = new Map<string, AppCapabilities.ProgressMonitor>();

    /** Brings the registry in line with the unread chats shown; companion chats on one object share its monitor. */
    const reconcile = () => {
      const wanted = new Map<string, string>();
      for (const chat of shown.values()) {
        wanted.set(unreadKey(chat), CHAT_UNREAD);
        const subject = Chat.getCompanionSubject(chat);
        if (subject) {
          wanted.set(unreadKey(subject), COMPANION_UNREAD);
        }
      }
      for (const [key, handle] of monitors) {
        if (!wanted.has(key)) {
          handle.remove();
          monitors.delete(key);
        }
      }
      for (const [key, label] of wanted) {
        if (!monitors.has(key)) {
          const handle = progress.register(key, { label });
          handle.done();
          monitors.set(key, handle);
        }
      }
    };

    /** Starts the grace period for a chat that turned unread, or drops one that was read. */
    const evaluate = (uri: string, chat: Chat.Chat) => {
      if (!Chat.isUnread(chat)) {
        clearTimeout(pending.get(uri));
        pending.delete(uri);
        if (shown.delete(uri)) {
          reconcile();
        }
      } else if (!shown.has(uri) && !pending.has(uri)) {
        pending.set(
          uri,
          setTimeout(() => {
            pending.delete(uri);
            if (Chat.isUnread(chat)) {
              shown.set(uri, chat);
              reconcile();
            }
          }, GRACE_MS),
        );
      }
    };

    const forget = (uri: string) => {
      clearTimeout(pending.get(uri));
      pending.delete(uri);
      shown.delete(uri);
    };

    const update = (spaceId: SpaceId, results: readonly Chat.Chat[]) => {
      const watched = chats.get(spaceId) ?? new Map();
      chats.set(spaceId, watched);
      const live = new Set<string>();
      for (const chat of results) {
        const uri = Obj.getURI(chat, { prefer: 'absolute' }).toString();
        live.add(uri);
        if (!watched.has(uri)) {
          watched.set(uri, { chat, unsubscribe: Obj.subscribe(chat, () => evaluate(uri, chat)) });
        }
        evaluate(uri, chat);
      }
      for (const [uri, { unsubscribe }] of watched) {
        if (!live.has(uri)) {
          unsubscribe();
          watched.delete(uri);
          forget(uri);
        }
      }
      reconcile();
    };

    // The spaces subscription re-delivers the whole list on every change, so each space is queried once.
    const queries = new Map<SpaceId, () => void>();
    const watchSpace = (space: Space) => {
      if (queries.has(space.id)) {
        return;
      }
      let unsubscribe: (() => void) | undefined;
      queries.set(space.id, () => unsubscribe?.());
      void space
        .waitUntilReady()
        .then(() => {
          if (queries.has(space.id)) {
            unsubscribe = space.db
              .query(Filter.type(Chat.Chat, { turns: Filter.gt(0) }))
              .subscribe(({ results }) => update(space.id, results), { fire: true });
          }
        })
        .catch((error) => log.warn('unread chats not watched', { space: space.id, error }));
    };
    const unwatchSpace = (spaceId: SpaceId) => {
      queries.get(spaceId)?.();
      queries.delete(spaceId);
      for (const [uri, { unsubscribe }] of chats.get(spaceId) ?? []) {
        unsubscribe();
        forget(uri);
      }
      chats.delete(spaceId);
    };
    const watchSpaces = (spaces: readonly Space[]) => {
      spaces.forEach(watchSpace);
      const live = new Set(spaces.map((space) => space.id));
      for (const spaceId of [...queries.keys()].filter((spaceId) => !live.has(spaceId))) {
        unwatchSpace(spaceId);
      }
      reconcile();
    };

    const spacesSubscription = client.spaces.subscribe(watchSpaces);
    watchSpaces(client.spaces.get());
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        spacesSubscription.unsubscribe();
        [...queries.keys()].forEach(unwatchSpace);
        for (const handle of monitors.values()) {
          handle.remove();
        }
        monitors.clear();
      }),
    );

    return [];
  }),
);
