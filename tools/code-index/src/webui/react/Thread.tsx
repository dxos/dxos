//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';
import { I18nProvider } from 'react-aria-components';

import { Obj } from '@dxos/echo';
import { ThemeProvider, Tooltip, defaultTx } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';
import { type MessageMetadata, Thread } from '@dxos/react-ui-thread';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { Message } from '@dxos/types';
import { hexToFallback } from '@dxos/util';

import type * as Fold from '../../workspace/Fold.ts';

/**
 * The chat, as `@dxos/react-ui-thread` renders it. The transcript arrives already folded from the
 * project log, so this component holds no state of its own: it maps turns to `Message` objects and
 * hands a typed line back up to Solid.
 */

const AGENT = { role: 'assistant' as const, identityDid: 'did:key:agent', name: 'code-index' };
const USER = { role: 'user' as const, identityDid: 'did:key:you', name: 'You' };

const metadata = (message: Message.Message): MessageMetadata => {
  const did = message.sender.identityDid ?? '0';
  const fallback = hexToFallback(did);
  return {
    id: Obj.getURI(message),
    timestamp: message.created,
    authorId: did,
    authorName: message.sender.name,
    authorAvatarProps: { hue: fallback.hue, emoji: fallback.emoji },
  };
};

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
    <Thread.Root getMetadata={metadata} identityDid={USER.identityDid} editable={!busy}>
      <Thread.Content classNames='dx-grow'>
        <Thread.Messages messages={messages} />
        <Thread.Textbox
          id='composer'
          authorId={USER.identityDid}
          authorName={USER.name}
          onSend={handleSend}
          disabled={busy}
        />
        <Thread.Status activity={busy}>Thinking…</Thread.Status>
      </Thread.Content>
    </Thread.Root>
  );
};

/**
 * The island's root. The providers live here rather than in the Solid shell: they are React
 * context, so they cannot be hoisted out of the island even though they wrap the whole of it.
 */
export const ThreadIsland = (props: ThreadIslandProps) => (
  <I18nProvider locale='en-US'>
    <ThemeProvider tx={defaultTx} themeMode='dark' resourceExtensions={threadTranslations}>
      <Tooltip.Provider>
        <Dnd.Root>
          <Transcript {...props} />
        </Dnd.Root>
      </Tooltip.Provider>
    </ThemeProvider>
  </I18nProvider>
);
