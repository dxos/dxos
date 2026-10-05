//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { I18nProvider } from 'react-aria-components';

import { ThemeProvider, defaultTx } from '@dxos/react-ui';
import { ChatThread } from '@dxos/react-ui-assistant';
import { translations as assistantTranslations } from '@dxos/react-ui-assistant/translations';
import { ChatEditor, ChatStatusIndicator } from '@dxos/react-ui-chat';
import { translations as chatTranslations } from '@dxos/react-ui-chat/translations';
import { useFeedModel } from '@dxos/react-ui-feed';
import { type ContentBlock, Message } from '@dxos/types';

import type * as Fold from '../../workspace/Fold.ts';

/**
 * The chat, as Composer's assistant renders it: `ChatThread` over a `FeedModel`, with the
 * repository's own codemirror composer below. The transcript arrives already folded from the
 * project log, so this component holds no transcript state of its own — it maps the fold's items to
 * `Message` objects and hands a typed line back up to Solid.
 *
 * Each code run becomes a `toolCall`/`toolResult` block pair inside the turn's assistant message,
 * which is what the assistant renderer folds into its collapsible tool panel at that point in the
 * prose.
 */

const AGENT = { role: 'assistant' as const, name: 'code-index' };
const USER = { role: 'user' as const, name: 'You' };

/** The one tool the agent has; every run is a sandbox `exec`. */
const TOOL_NAME = 'exec';

export type ThreadIslandProps = {
  readonly items: readonly Fold.Item[];
  readonly busy: boolean;
  readonly onSend: (text: string) => void;
};

/** One message as the thread shows it, before it becomes a `Message`: a prompt or a turn's reply. */
type Row = { readonly key: string; readonly role: 'user' | 'assistant'; readonly blocks: ContentBlock.Any[] };

const toolBlocks = (item: Extract<Fold.Item, { kind: 'tool' }>): ContentBlock.Any[] => [
  {
    _tag: 'toolCall',
    toolCallId: item.id,
    name: TOOL_NAME,
    input: JSON.stringify({ code: item.code }),
    providerExecuted: false,
  },
  ...(item.output === undefined
    ? []
    : [
        {
          _tag: 'toolResult' as const,
          toolCallId: item.id,
          name: TOOL_NAME,
          ...(item.ok === false ? { error: item.output } : { result: item.output }),
          providerExecuted: false,
        },
      ]),
];

/**
 * Groups the fold's items into rows: each prompt is a row, and everything the agent produced until
 * the next prompt is ONE assistant row whose blocks keep the turn's order — the renderer puts each
 * tool run where it falls between the prose.
 */
const toRows = (items: readonly Fold.Item[]): Row[] => {
  const rows: Row[] = [];
  for (const item of items) {
    if (item.kind === 'user') {
      rows.push({ key: item.id, role: 'user', blocks: [{ _tag: 'text', text: item.text }] });
      continue;
    }
    let reply = rows.at(-1);
    if (reply?.role !== 'assistant') {
      reply = { key: `reply:${item.id}`, role: 'assistant', blocks: [] };
      rows.push(reply);
    }
    if (item.kind === 'tool') {
      reply.blocks.push(...toolBlocks(item));
    } else {
      reply.blocks.push({ _tag: 'text', text: item.text });
    }
  }
  return rows;
};

const Transcript = ({ items, busy, onSend }: ThreadIslandProps) => {
  // Message ids must survive re-renders: the feed reconciles a row by id, so a streaming reply that
  // got a fresh id per delta would remount on every token instead of growing in place.
  const ids = useRef(new Map<string, Message.Message['id']>());
  const messages = useMemo(
    () =>
      toRows(items).map((row) => {
        const message = Message.make({
          id: ids.current.get(row.key),
          sender: row.role === 'user' ? USER : AGENT,
          blocks: row.blocks,
        });
        ids.current.set(row.key, message.id);
        return message;
      }),
    [items],
  );

  // The reply still being written is the streaming tail: the feed types it out instead of pasting it.
  const last = messages.at(-1);
  const streamingId = busy && last?.sender.role === 'assistant' ? last.id : undefined;

  // `stops: 'prompt'` is what makes each of the user's turns a stop, so the thread brings the last
  // prompt to the top and the nav steps question to question rather than row to row.
  const model = useFeedModel(messages, { stops: 'prompt' });
  useEffect(() => model.setStreaming(streamingId), [model, streamingId]);

  const handleSend = useCallback(
    (text: string) => {
      onSend(text);
      // `true` clears the composer; the message appears when the log echoes it back, so an
      // optimistic copy would show for a moment and then double.
      return true;
    },
    [onSend],
  );

  return (
    // `thinking` shows the agent's reasoning and tool blocks rather than the answer alone, which is
    // the view this workspace wants: the point is watching it query the graph.
    <ChatThread.Root model={model} viewType='thinking'>
      <div className='flex flex-col dx-grow overflow-hidden'>
        <div className='dx-expand relative'>
          <ChatThread.Viewport classNames='dx-cover' />
        </div>
        {/* The composer needs a testid of its own: the feed renders every message through
            codemirror as well, so `.cm-content` alone matches message bodies too. */}
        <div className='flex items-center gap-2 p-2 border-t border-separator' data-testid='code-index.composer'>
          <ChatEditor
            id='composer'
            classNames='dx-grow'
            lineWrapping
            placeholder={busy ? 'Working…' : 'Ask about the repository…'}
            onSubmit={handleSend}
          />
          <ChatStatusIndicator processing={busy} />
        </div>
      </div>
    </ChatThread.Root>
  );
};

/**
 * The island's root. The providers live here rather than in the Solid shell: they are React
 * context, so they cannot be hoisted out of the island even though they wrap the whole of it.
 */
export const ThreadIsland = (props: ThreadIslandProps) => {
  const themeMode = useDocumentThemeMode();
  return (
    <I18nProvider locale='en-US'>
      <ThemeProvider
        tx={defaultTx}
        themeMode={themeMode}
        resourceExtensions={[...assistantTranslations, ...chatTranslations]}
      >
        <Transcript {...props} />
      </ThemeProvider>
    </I18nProvider>
  );
};

const subscribeToDocumentClass = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['class'] });
  return () => observer.disconnect();
};

const documentThemeMode = (): 'dark' | 'light' =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

/**
 * The mode the page is actually drawn in. `@dxos/ui-theme` toggles `html.dark` from the OS preference,
 * and components that pick colours from `useThemeMode` (the tool panel's code highlighter) must agree
 * with it, or dark-theme token colours land on a light background and vanish.
 */
const useDocumentThemeMode = () => useSyncExternalStore(subscribeToDocumentClass, documentThemeMode);
