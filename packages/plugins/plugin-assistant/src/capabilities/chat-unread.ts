//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { agentProgressKey } from '@dxos/agent-runtime';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Chat from '@dxos/assistant/Chat';
import { type Space } from '@dxos/client/echo';
import { type Feed, Filter, Obj } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { getSeen, unseenQuery } from '@dxos/schema';

const CHAT_UNREAD = 'New reply from the assistant';
const COMPANION_UNREAD = 'The assistant finished work on this';

/** Long enough for a member's open view to mark new items seen, so a chat someone is reading never flashes unread. */
const GRACE_MS = 2_000;

/** The unread monitor on an object, keyed `<uri>#<suffix>` so the object's navtree row finds it. */
const unreadKey = (object: Obj.Unknown) => `${Obj.getURI(object, { prefer: 'absolute' }).toString()}#unread`;

/**
 * Reports each chat whose feed has items after its seen cursor ({@link unseenQuery}) to the progress registry as a done
 * monitor, on the chat and, for a companion chat, on the object it accompanies. A chat shows only once it has stayed
 * unread for {@link GRACE_MS}, and an object only while no agent turn runs on it, so the mark means finished work.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const progressOption = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(progressOption)) {
      return [];
    }
    const progress = progressOption.value;
    const registry = yield* Capabilities.AtomRegistry;

    // Chats by space, each watching its feed's seen cursor and whether anything follows it.
    const chats = new Map<SpaceId, Map<string, { chat: Chat.Chat; unread: boolean; dispose: () => void }>>();
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    const shown = new Map<string, Chat.Chat>();
    const monitors = new Map<string, AppCapabilities.ProgressMonitor>();

    /** Brings the registry in line with the unread chats shown; companion chats on one object share its monitor. */
    const reconcile = () => {
      const running = progress
        .snapshot()
        .tasks.filter((task) => task.status === 'pending' || task.status === 'running')
        .map((task) => task.name);
      const isWorking = (object: Obj.Unknown) => {
        const prefix = agentProgressKey(object);
        return running.some((name) => name.startsWith(prefix));
      };
      const wanted = new Map<string, string>();
      for (const chat of shown.values()) {
        if (!isWorking(chat)) {
          wanted.set(unreadKey(chat), CHAT_UNREAD);
        }
        const subject = Chat.getCompanionSubject(chat);
        if (subject && !isWorking(subject)) {
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

    const isUnread = (spaceId: SpaceId, uri: string) => chats.get(spaceId)?.get(uri)?.unread ?? false;

    /** Starts the grace period for a chat that turned unread, or drops one that was read. */
    const evaluate = (spaceId: SpaceId, uri: string, chat: Chat.Chat) => {
      if (!isUnread(spaceId, uri)) {
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
            if (isUnread(spaceId, uri)) {
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

    /** Follows a chat's feed: its seen cursor, and a one-item query for anything after it. */
    const watchChat = (spaceId: SpaceId, uri: string, chat: Chat.Chat) => {
      const entry = { chat, unread: false, dispose: () => {} };
      const setUnread = (unread: boolean) => {
        if (entry.unread !== unread) {
          entry.unread = unread;
          evaluate(spaceId, uri, chat);
        }
      };
      let disposed = false;
      let unsubscribeFeed: (() => void) | undefined;
      let unsubscribeQuery: (() => void) | undefined;
      let seen: Feed.Cursor | undefined;
      const follow = (feed: Feed.Feed) => {
        const next = getSeen(feed);
        if (next === seen && unsubscribeQuery) {
          return;
        }
        seen = next;
        unsubscribeQuery?.();
        unsubscribeQuery = undefined;
        const db = Obj.getDatabase(feed);
        if (seen === undefined || !db) {
          setUnread(false);
          return;
        }
        unsubscribeQuery = db
          .query(unseenQuery(feed, seen).limit(1))
          .subscribe(({ results }) => setUnread(results.length > 0), { fire: true });
      };
      void chat.feed
        .load()
        .then((feed) => {
          if (!disposed) {
            unsubscribeFeed = Obj.subscribe(feed, () => follow(feed));
            follow(feed);
          }
        })
        .catch((error) => log.warn('chat feed not watched', { chat: uri, error }));
      entry.dispose = () => {
        disposed = true;
        unsubscribeFeed?.();
        unsubscribeQuery?.();
      };
      return entry;
    };

    const update = (spaceId: SpaceId, results: readonly Chat.Chat[]) => {
      const watched = chats.get(spaceId) ?? new Map();
      chats.set(spaceId, watched);
      const live = new Set<string>();
      for (const chat of results) {
        const uri = Obj.getURI(chat, { prefer: 'absolute' }).toString();
        live.add(uri);
        if (!watched.has(uri)) {
          watched.set(uri, watchChat(spaceId, uri, chat));
        }
      }
      for (const [uri, { dispose }] of watched) {
        if (!live.has(uri)) {
          dispose();
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
              .query(Filter.type(Chat.Chat))
              .subscribe(({ results }) => update(space.id, results), { fire: true });
          }
        })
        .catch((error) => log.warn('unread chats not watched', { space: space.id, error }));
    };
    const unwatchSpace = (spaceId: SpaceId) => {
      queries.get(spaceId)?.();
      queries.delete(spaceId);
      for (const [uri, { dispose }] of chats.get(spaceId) ?? []) {
        dispose();
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
    // A turn starting or ending changes which unread chats may show; deferred, since reconcile writes the snapshot.
    const unsubscribeProgress = registry.subscribe(progress.snapshotAtom, () => queueMicrotask(reconcile));
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        spacesSubscription.unsubscribe();
        unsubscribeProgress();
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
