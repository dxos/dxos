//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { Message, Thread } from '@dxos/types';

import { hideSupersededPending } from '../util/pending.ts';

/** Blocks a comment shows; the rest (reasoning, tool calls, bindings) is the agent's working state in the same feed. */
const VISIBLE_BLOCKS = new Set(['text', 'proposal', 'reference', 'image', 'file', 'error']);

const isVisibleBlock = (block: Message.Message['blocks'][number]): boolean =>
  VISIBLE_BLOCKS.has(block._tag) &&
  !(block._tag === 'text' && (block.disposition === 'synthetic' || block.disposition === 'cot'));

const NO_FEED = Query.select(Filter.type(Message.Message));

/** Whether a message from a thread's feed belongs in the comment UI. */
export const isCommentMessage = (message: Message.Message): boolean => message.blocks.some(isVisibleBlock);

/** A thread's comment messages in send order, live; empty for a thread not yet saved. */
export const useThreadMessages = (thread: Thread.Thread | undefined): Message.Message[] => {
  const feed = useResolveRef(thread?.feed);
  const db = thread ? Obj.getDatabase(thread) : undefined;
  // Without a feed there is nothing to read; the fallback query only keeps the hook's call shape stable.
  const messages = useQuery(feed ? db : undefined, feed ? Thread.messagesQuery(feed) : NO_FEED);
  return useMemo(() => hideSupersededPending(Thread.sortMessages(messages.filter(isCommentMessage))), [messages]);
};
