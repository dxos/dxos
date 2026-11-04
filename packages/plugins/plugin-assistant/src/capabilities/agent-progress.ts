//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Chat from '@dxos/assistant/Chat';
import { type Space } from '@dxos/client/echo';
import * as Process from '@dxos/compute/Process';
import { Annotation, Filter, Obj, Ref } from '@dxos/echo';
import { EID, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { AssistantCapabilities } from '#types';

/** A turn is under way: starting on a remote runtime, running, or waiting on a child process or an alarm. */
const BUSY_STATES: ReadonlySet<Process.State> = new Set([
  Process.State.STARTING,
  Process.State.RUNNING,
  Process.State.HYBERNATING,
]);

const CHAT_WORKING = 'Assistant is working';
const COMPANION_WORKING = 'Assistant is working on this';
const CHAT_UNREAD = 'New reply from the assistant';
const COMPANION_UNREAD = 'The assistant finished work on this';

/** The agent's monitor on an object, keyed `<uri>#<suffix>` so the object's navtree row finds it. */
const agentProgressKey = (uri: string) => `${uri}#agent`;

/**
 * Reports each agent turn to the progress registry, on its chat and, for a companion chat, on the object it accompanies.
 * Turns come from the process tree, which also lists remote runtimes' processes, so a turn shows wherever it runs and
 * ends when its process does. A finished turn nobody has read stays as a done monitor until the chat is opened; read
 * state comes from `Chat.unread`, which the space shares, and a chat open here shows none.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const processManager = yield* Capabilities.ProcessManager;
    const atomRegistry = yield* Capabilities.AtomRegistry;
    const openChatsAtom = yield* AssistantCapabilities.OpenChats;

    const progressOption = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(progressOption)) {
      return [];
    }
    const progress = progressOption.value;

    // The chat URIs busy processes were spawned against.
    const busyChats = Atom.make(
      (get) =>
        new Set(
          get(processManager.processTreeAtom)
            .filter((process) => BUSY_STATES.has(process.state))
            .flatMap((process) =>
              Option.toArray(Annotation.getDictionary(process.params.annotations, Process.TargetAnnotation)),
            )
            .map(String),
        ),
    );

    /** The object a companion chat accompanies: its ECHO parent, when that names the chat as a companion. */
    const subjectOf = (chat: Chat.Chat): string | undefined => {
      const subject = Obj.getParent(chat);
      const companions = subject
        ? Annotation.get(subject, Chat.CompanionChatAnnotation).pipe(Option.getOrElse(() => []))
        : [];
      return subject && companions.some((ref) => ref.uri === Ref.make(chat).uri)
        ? Obj.getURI(subject, { prefer: 'absolute' }).toString()
        : undefined;
    };

    // Each busy chat's subject; `null` while it resolves or when it has none.
    const subjects = new Map<string, string | null>();
    const resolveSubject = (uri: string) => {
      const eid = EID.tryParse(uri);
      const spaceId = eid && EID.getSpaceId(eid);
      const space = spaceId && client.spaces.get(spaceId);
      if (!eid || !space) {
        return;
      }
      void space
        .waitUntilReady()
        .then(() => space.db.makeRef(eid).tryLoad())
        .then((chat) => {
          subjects.set(uri, (Obj.instanceOf(Chat.Chat, chat) && subjectOf(chat)) || null);
          reconcile();
        })
        .catch((error) => log.warn('companion subject did not resolve', { uri, error }));
    };

    // Each space's chats with an unread turn.
    const unread = new Map<SpaceId, readonly Chat.Chat[]>();

    type Shown = { label: string; done: boolean };
    const monitors = new Map<string, Shown & { handle: AppCapabilities.ProgressMonitor }>();

    /** Brings the registry in line with the turns running and unread now; companion chats on one object share its monitor. */
    const reconcile = () => {
      const busy = atomRegistry.get(busyChats);
      const wanted = new Map<string, Shown>();
      for (const uri of busy) {
        wanted.set(agentProgressKey(uri), { label: CHAT_WORKING, done: false });
        const subject = subjects.get(uri);
        if (subject === undefined) {
          subjects.set(uri, null);
          resolveSubject(uri);
        } else if (subject) {
          wanted.set(agentProgressKey(subject), { label: COMPANION_WORKING, done: false });
        }
      }
      const open = atomRegistry.get(openChatsAtom);
      const finished = new Map<string, Shown>();
      for (const chat of [...unread.values()].flat()) {
        const uri = Obj.getURI(chat, { prefer: 'absolute' }).toString();
        if (busy.has(uri) || open.has(uri)) {
          continue;
        }
        finished.set(agentProgressKey(uri), { label: CHAT_UNREAD, done: true });
        const subject = subjectOf(chat);
        if (subject) {
          finished.set(agentProgressKey(subject), { label: COMPANION_UNREAD, done: true });
        }
      }
      // Unread never displaces a running turn on the same object.
      for (const [key, shown] of finished) {
        if (!wanted.has(key)) {
          wanted.set(key, shown);
        }
      }
      for (const uri of subjects.keys()) {
        if (!busy.has(uri)) {
          subjects.delete(uri);
        }
      }

      for (const [key, { handle }] of monitors) {
        if (!wanted.has(key)) {
          handle.remove();
          monitors.delete(key);
        }
      }
      for (const [key, { label, done }] of wanted) {
        const current = monitors.get(key);
        if (current?.label !== label || current.done !== done) {
          const handle = progress.register(key, { label });
          if (done) {
            handle.done();
          }
          monitors.set(key, { handle, label, done });
        }
      }
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
            unsubscribe = space.db.query(Filter.type(Chat.Chat, { unread: true })).subscribe(
              ({ results }) => {
                unread.set(space.id, results);
                reconcile();
              },
              { fire: true },
            );
          }
        })
        .catch((error) => log.warn('unread chats not watched', { space: space.id, error }));
    };
    const unwatchSpace = (spaceId: SpaceId) => {
      queries.get(spaceId)?.();
      queries.delete(spaceId);
      unread.delete(spaceId);
    };
    const watchSpaces = (spaces: readonly Space[]) => {
      spaces.forEach(watchSpace);
      const live = new Set(spaces.map((space) => space.id));
      for (const spaceId of [...queries.keys()].filter((spaceId) => !live.has(spaceId))) {
        unwatchSpace(spaceId);
      }
      reconcile();
    };

    const unsubscribe = [
      atomRegistry.subscribe(busyChats, reconcile),
      atomRegistry.subscribe(openChatsAtom, reconcile),
    ];
    const spacesSubscription = client.spaces.subscribe(watchSpaces);
    watchSpaces(client.spaces.get());
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe.forEach((unsubscribe) => unsubscribe());
        spacesSubscription.unsubscribe();
        [...queries.keys()].forEach(unwatchSpace);
        for (const { handle } of monitors.values()) {
          handle.remove();
        }
        monitors.clear();
      }),
    );

    return [];
  }),
);
