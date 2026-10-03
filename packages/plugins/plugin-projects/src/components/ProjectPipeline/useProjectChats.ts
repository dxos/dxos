//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Chat from '@dxos/assistant/Chat';
import type * as Project from '@dxos/compute/Project';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space } from '@dxos/react-client/echo';

/**
 * The chats filed under a project, live. Every chat in the space, narrowed by the parent walk: the
 * query re-emits when one is added — which is exactly when a session begins.
 */
export const useProjectChats = (space: Space | undefined, project: Project.Project): Chat.Chat[] => {
  const allChats = useQuery(space?.db, Filter.type(Chat.Chat));
  return useMemo(() => allChats.filter((chat) => Chat.peekProject(chat)?.id === project.id), [allChats, project.id]);
};
