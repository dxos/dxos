//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as Chat from '@dxos/assistant/Chat';
import { DXN, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { Trajectory } from '@dxos/trajectory';

/**
 * Typename of the records a chat's feed held, before trajectory events, each time a skill or object was bound to it;
 * named by typename because the `AiContext` module that defines them carries the heavy session runtime.
 */
const LEGACY_BINDING_TYPE = DXN.make('org.dxos.type.contextBinding', '0.1.0');

const isBindingEntry = (item: Obj.Unknown): boolean =>
  Obj.instanceOf(Trajectory.Event, item)
    ? item.payload._tag === 'contextBind' || item.payload._tag === 'contextUnbind'
    : true;

/** The agent's primary chat: the newest one without a foreign key, since channel conversations carry one. */
export const selectPrimaryChat = (chats: readonly Chat.Chat[]): Chat.Chat | undefined =>
  chats
    .filter((chat) => Obj.getMeta(chat).keys.length === 0)
    .sort((left, right) => left.id.localeCompare(right.id))
    .at(-1);

/**
 * How many binding entries the chat's feed holds: legacy binding records and `contextBind`/`contextUnbind` events. It changes whenever a skill is bound or unbound (a mode
 * switch, a customization), so a skill list read through `ListSkills` re-reads on it rather than going stale.
 */
export const useBindingCount = (chat: Chat.Chat | undefined): number => {
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const query = useMemo(
    () =>
      feed
        ? Query.select(Filter.or(Filter.type(LEGACY_BINDING_TYPE), Filter.type(Trajectory.Event))).from(feed)
        : Query.select(Filter.nothing()),
    [feed],
  );
  return useQuery(chat ? Obj.getDatabase(chat) : undefined, query).filter(isBindingEntry).length;
};
