//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as Chat from '@dxos/assistant/Chat';
import { DXN, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';

/**
 * Typename of the entries a chat's feed records each time a skill or object is bound to it; named by typename because
 * the `AiContext` module that defines them carries the heavy session runtime.
 */
const BINDING_TYPE = DXN.make('org.dxos.type.contextBinding', '0.1.0');

/** The agent's primary chat: the newest one without a foreign key, since channel conversations carry one. */
export const selectPrimaryChat = (chats: readonly Chat.Chat[]): Chat.Chat | undefined =>
  chats
    .filter((chat) => Obj.getMeta(chat).keys.length === 0)
    .sort((left, right) => left.id.localeCompare(right.id))
    .at(-1);

/**
 * How many binding entries the chat's feed holds. It changes whenever a skill is bound or unbound (a mode
 * switch, a customization), so a skill list read through `ListSkills` re-reads on it rather than going stale.
 */
export const useBindingCount = (chat: Chat.Chat | undefined): number => {
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const query = useMemo(
    () => (feed ? Query.select(Filter.type(BINDING_TYPE)).from(feed) : Query.select(Filter.nothing())),
    [feed],
  );
  return useQuery(chat ? Obj.getDatabase(chat) : undefined, query).length;
};
