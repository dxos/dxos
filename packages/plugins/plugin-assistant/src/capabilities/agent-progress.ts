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
import * as Process from '@dxos/compute/Process';
import { Annotation, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

/** A turn is under way: starting on a remote runtime, running, or waiting on a child process or an alarm. */
const BUSY_STATES: ReadonlySet<Process.State> = new Set([
  Process.State.STARTING,
  Process.State.RUNNING,
  Process.State.HYBERNATING,
]);

const CHAT_WORKING = 'Assistant is working';
const COMPANION_WORKING = 'Assistant is working on this';

/** The agent's monitor on an object, keyed `<uri>#<suffix>` so the object's navtree row finds it. */
const agentProgressKey = (uri: string) => `${uri}#agent`;

/**
 * Reports each agent turn to the progress registry, on its chat and, for a companion chat, on the object it accompanies.
 * Turns come from the process tree, which also lists remote runtimes' processes, so a turn shows wherever it runs and
 * ends when its process does.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const processManager = yield* Capabilities.ProcessManager;
    const atomRegistry = yield* Capabilities.AtomRegistry;

    // Optional: a host without plugin-progress loses the indicator, not the plugin.
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

    // Each busy chat's subject, once its chat has loaded; `null` when it has none.
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

    // Every monitor this module holds, by key, with the label it was registered with.
    const monitors = new Map<string, { handle: AppCapabilities.ProgressMonitor; label: string }>();

    /** Brings the registry in line with what is running now; two companion chats on one object share its monitor. */
    const reconcile = () => {
      const busy = atomRegistry.get(busyChats);
      const wanted = new Map<string, string>();
      for (const uri of busy) {
        wanted.set(agentProgressKey(uri), CHAT_WORKING);
        const subject = subjects.get(uri);
        if (subject === undefined) {
          subjects.set(uri, null);
          resolveSubject(uri);
        } else if (subject) {
          wanted.set(agentProgressKey(subject), COMPANION_WORKING);
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
      for (const [key, label] of wanted) {
        if (monitors.get(key)?.label !== label) {
          monitors.set(key, { handle: progress.register(key, { label }), label });
        }
      }
    };

    reconcile();
    const unsubscribe = atomRegistry.subscribe(busyChats, reconcile);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
        for (const { handle } of monitors.values()) {
          handle.remove();
        }
        monitors.clear();
      }),
    );

    return [];
  }),
);
