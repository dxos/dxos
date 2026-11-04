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

import { AssistantNamespace } from '../namespace.ts';

/** A turn is under way: starting on a remote runtime, running, or waiting on a child process or an alarm. */
const BUSY_STATES: ReadonlySet<Process.State> = new Set([
  Process.State.STARTING,
  Process.State.RUNNING,
  Process.State.HYBERNATING,
]);

/** A pulsing star in the text colour, which takes the mark from presence (priority 10). */
const working: Activity.Treatment = { slot: 'mark', icon: 'star', priority: 30, animate: true };

const chatWorking: Activity.Entry = {
  source: 'assistant',
  label: ['activity.chat-working.label', { ns: AssistantNamespace.key }],
  treatment: working,
};

const companionWorking: Activity.Entry = {
  source: 'assistant',
  label: ['activity.companion-working.label', { ns: AssistantNamespace.key }],
  treatment: working,
};

/** A still amber star, under the working one and over presence. */
const unread: Activity.Treatment = { slot: 'mark', icon: 'star', hue: 'amber', priority: 20 };

const chatUnread: Activity.Entry = {
  source: 'assistant',
  label: ['activity.chat-unread.label', { ns: AssistantNamespace.key }],
  treatment: unread,
};

const companionUnread: Activity.Entry = {
  source: 'assistant',
  label: ['activity.companion-unread.label', { ns: AssistantNamespace.key }],
  treatment: unread,
};

/**
 * Puts the agent star on a chat while its agent runs a turn, and on the object a companion chat accompanies while that
 * chat does; a finished turn nobody has seen keeps a still star until someone opens the chat. Work comes from the
 * process tree, because a session outlives the chat view that started it; unread comes from the chat, shared by the
 * space.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const processManager = yield* Capabilities.ProcessManager;

    // The URIs busy processes were spawned against; an agent's target is its chat.
    const busyTargets = Atom.make(
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

    return Capability.contribute(AppCapabilities.ActivitySource, {
      id: AssistantNamespace.key,
      activity: ({ uri, object }) =>
        Atom.make((get): readonly Activity.Entry[] => {
          if (!object) {
            return [];
          }

          const busy = get(busyTargets);
          if (Obj.instanceOf(Chat.Chat, object)) {
            return busy.has(uri) ? [chatWorking] : get(Obj.atomProperty(object, 'unread')) ? [chatUnread] : [];
          }

          // A companion ref is local to the subject's space; process targets carry the space.
          const spaceId = EID.getSpaceId(EID.parse(uri));
          const companions = get(Annotation.atom(object, Chat.CompanionChatAnnotation)).pipe(
            Option.getOrElse(() => []),
          );
          return companions.some((ref) =>
            busy.has(String(EID.make({ spaceId, entityId: EID.getEntityId(EID.parse(ref.uri)) }))),
          )
            ? [companionWorking]
            : companions.some((ref) => get(Obj.atomProperty(ref, 'unread')))
              ? [companionUnread]
              : [];
        }),
    });
  }),
);
