//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';
import { I18nProvider } from 'react-aria-components';

import { ThemeProvider, Tooltip, defaultTx } from '@dxos/react-ui';
import { ChatThread } from '@dxos/react-ui-assistant';
import { translations as assistantTranslations } from '@dxos/react-ui-assistant/translations';
import { ChatEditor, ChatStatusIndicator } from '@dxos/react-ui-chat';
import { translations as chatTranslations } from '@dxos/react-ui-chat/translations';
import { useFeedModel } from '@dxos/react-ui-feed';
import { Message } from '@dxos/types';

import type * as Fold from '../../workspace/Fold.ts';

/**
 * The chat, as Composer's assistant renders it: `ChatThread` over a `FeedModel`, with the
 * repository's own codemirror composer below. The transcript arrives already folded from the
 * project log, so this component holds no state of its own — it maps turns to `Message` objects and
 * hands a typed line back up to Solid.
 */

const AGENT = { role: 'assistant' as const, name: 'code-index' };
const USER = { role: 'user' as const, name: 'You' };

export type ThreadIslandProps = {
  readonly turns: readonly Fold.Turn[];
  readonly busy: boolean;
  readonly onSend: (text: string) => void;
};

const Transcript = ({ turns, busy, onSend }: ThreadIslandProps) => {
  const messages = useMemo(
    () =>
      turns.map((turn) =>
        Message.make({
          sender: turn.role === 'user' ? USER : AGENT,
          blocks: [{ _tag: 'text', text: turn.text }],
        }),
      ),
    [turns],
  );

  // `stops: 'prompt'` is what makes each of the user's turns a stop, so the thread brings the last
  // prompt to the top and the nav steps question to question rather than row to row.
  const model = useFeedModel(messages, { stops: 'prompt' });

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
          <ChatThread.Viewport classNames='dx-fullscreen' padding />
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
export const ThreadIsland = (props: ThreadIslandProps) => (
  <I18nProvider locale='en-US'>
    <ThemeProvider tx={defaultTx} themeMode='dark' resourceExtensions={[...assistantTranslations, ...chatTranslations]}>
      <Tooltip.Provider>
        <Transcript {...props} />
      </Tooltip.Provider>
    </ThemeProvider>
  </I18nProvider>
);
