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
import { Annotation, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { type Activity } from '@dxos/react-ui-attention/types';

import { AssistantCapabilities } from '#types';

import { AssistantNamespace } from '../namespace.ts';
import { makeChatReads } from './chat-reads.ts';

/** A turn is under way: starting on a remote runtime, running, or waiting on a child process or an alarm. */
const BUSY_STATES: ReadonlySet<Process.State> = new Set([
  Process.State.STARTING,
  Process.State.RUNNING,
  Process.State.HYBERNATING,
]);

const chatWorking: Activity.Entry = {
  source: 'assistant',
  label: ['activity.chat-working.label', { ns: AssistantNamespace.key }],
  treatment: 'agent',
};

const companionWorking: Activity.Entry = {
  source: 'assistant',
  label: ['activity.companion-working.label', { ns: AssistantNamespace.key }],
  treatment: 'agent',
};

const chatUnread: Activity.Entry = {
  source: 'assistant',
  label: ['activity.chat-unread.label', { ns: AssistantNamespace.key }],
  treatment: 'agent-done',
};

const companionUnread: Activity.Entry = {
  source: 'assistant',
  label: ['activity.companion-unread.label', { ns: AssistantNamespace.key }],
  treatment: 'agent-done',
};

/**
 * Puts the agent star on a chat while its agent runs a turn, and on the object a companion chat accompanies while that
 * chat does; once the turn finishes unseen, the star moves to the corner until the chat is opened. The process tree is
 * the source because a session outlives the chat view that started it.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const processManager = yield* Capabilities.ProcessManager;

    // The URIs busy processes were spawned against; an agent's target is its chat.
    const busyTargets = Atom.make<ReadonlySet<string>>(
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

    const { reads, dispose } = makeChatReads(registry, busyTargets);
    yield* Effect.addFinalizer(() => Effect.sync(dispose));

    return [
      Capability.contribute(AssistantCapabilities.ChatReads, reads),
      Capability.contribute(AppCapabilities.ActivitySource, {
        id: AssistantNamespace.key,
        activity: ({ uri, object }) =>
          Atom.make((get): readonly Activity.Entry[] => {
            if (!object) {
              return [];
            }

            const busy = get(busyTargets);
            const unread = get(reads.unread);
            if (Obj.instanceOf(Chat.Chat, object)) {
              return busy.has(uri) ? [chatWorking] : unread.has(uri) ? [chatUnread] : [];
            }

            // A companion ref is local to the subject's space; process targets carry the space.
            const spaceId = EID.getSpaceId(EID.parse(uri));
            const companions = get(Annotation.atom(object, Chat.CompanionChatAnnotation))
              .pipe(Option.getOrElse(() => []))
              .map((ref) => String(EID.make({ spaceId, entityId: EID.getEntityId(EID.parse(ref.uri)) })));
            return companions.some((companion) => busy.has(companion))
              ? [companionWorking]
              : companions.some((companion) => unread.has(companion))
                ? [companionUnread]
                : [];
          }),
      }),
    ];
  }),
);
