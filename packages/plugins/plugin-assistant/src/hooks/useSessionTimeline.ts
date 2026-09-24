//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import * as Chat from '@dxos/assistant/Chat';
import type * as Process from '@dxos/compute/Process';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import {
  type Session,
  type SessionTimeline,
  useSessionTimeline as useNaturalSessionTimeline,
} from '@dxos/react-ui-trace';
import { Task } from '@dxos/types';

const atomEmpty = Atom.make(() => [] as const as readonly Process.Info[]);

/** A chat as the timeline's session: its uri is the agent process's target, its feed the trace meta's. */
export const sessionFromChat = (chat: Chat.Chat): Session => ({
  id: chat.id,
  label: chat.name,
  uri: Obj.getURI(chat),
  feedId: Chat.feedEntityId(chat),
  taskIds: chat.tasks.map((ref) => Task.refEntityId(ref)).filter((id): id is string => id !== undefined),
});

export type UseSessionTimelineOptions = {
  /** The chats whose sessions are shown; each contributes a session lane and its checklist's task lanes. */
  chats: readonly Chat.Chat[];
  tasks?: readonly Task.Task[];
};

/**
 * The live session timeline of the given chats, with the app's process monitor joined in.
 */
export const useSessionTimeline = (
  space: Space | undefined,
  { chats, tasks }: UseSessionTimelineOptions,
): SessionTimeline => {
  const monitor = useOptionalCapability(Capabilities.ProcessMonitor);
  const processes = useAtomValue(
    useMemo(() => monitor?.processTreeAtom.pipe(Atom.debounce(Duration.millis(500))) ?? atomEmpty, [monitor]),
  );
  const sessions = useMemo(() => chats.map(sessionFromChat), [chats]);
  return useNaturalSessionTimeline(space, { sessions, tasks, processes });
};
