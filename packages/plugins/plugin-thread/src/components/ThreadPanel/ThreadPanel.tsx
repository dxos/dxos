//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type Identity, type Space } from '@dxos/halo';
import { IconButton, Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type ThreadRootProps } from '@dxos/react-ui-thread';
import { type Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { MessageThread } from '../MessageThread';

export type ThreadPanelProps = ThemedClassName<{
  /** Root message the thread branches from; absent when it has been deleted. */
  root?: Message.Message;
  /** Thread id (the root message's id) — scopes the message list and outgoing replies. */
  threadId: string;
  /** Replies, ascending. */
  replies: readonly Message.Message[];
  /** Thread name, shown in the header and editable by the root's author. */
  name?: string;
  identity?: Identity.Info;
  members: readonly Space.Member[];
  readOnly?: boolean;
  editable?: boolean;
  getReactions?: ThreadRootProps['getReactions'];
  canDelete?: ThreadRootProps['canDelete'];
  onMessageReact?: (messageId: string, emoji: string) => void;
  onMessageDelete?: (messageId: string) => void;
  /** Renames the thread; omit when the local identity may not (only the root's author may). */
  onRename?: (name: string) => void;
  onClose: () => void;
  /** Posts a reply into this thread. */
  onSend: (text: string) => boolean;
}>;

/**
 * One thread of a channel: its root message followed by its replies, with a composer that posts
 * back into the same thread. Rendered beside the main (roots-only) channel view.
 */
export const ThreadPanel = ({
  root,
  threadId,
  replies,
  name,
  identity,
  members,
  readOnly,
  editable,
  getReactions,
  canDelete,
  onMessageReact,
  onMessageDelete,
  onRename,
  onClose,
  onSend,
  classNames,
}: ThreadPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Held locally while typing so each keystroke isn't a feed re-append; committed on blur/Enter.
  const [draftName, setDraftName] = useState<string | undefined>(undefined);

  const commitName = useCallback(() => {
    if (draftName !== undefined && draftName !== (name ?? '')) {
      onRename?.(draftName);
    }
    setDraftName(undefined);
  }, [draftName, name, onRename]);

  // The root is rendered as the first message of the thread so the branch point stays visible.
  const messages = root ? [root, ...replies] : replies;

  return (
    <div role='complementary' data-testid='thread.panel' className={mx('flex flex-col min-h-0', classNames)}>
      <div className='flex items-center gap-1 pis-2 pie-1 py-1 border-be border-separator'>
        {onRename ? (
          <Input.Root>
            <Input.Label srOnly>{t('thread-name.label')}</Input.Label>
            <Input.TextInput
              data-testid='thread.panel.name'
              variant='subdued'
              placeholder={t('thread-name.placeholder')}
              value={draftName ?? name ?? ''}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => event.key === 'Enter' && commitName()}
            />
          </Input.Root>
        ) : (
          <p className='grow truncate text-sm font-medium'>{name ?? t('thread.heading')}</p>
        )}
        <IconButton
          data-testid='thread.panel.close'
          variant='ghost'
          density='sm'
          icon='ph--x--regular'
          iconOnly
          label={t('thread-back.label')}
          onClick={onClose}
        />
      </div>
      <MessageThread
        id={threadId}
        classNames='min-h-0 grow'
        identity={identity}
        members={members}
        messages={messages}
        readOnly={readOnly}
        editable={editable}
        placeholder={t('thread-reply.placeholder')}
        getReactions={getReactions}
        canDelete={canDelete}
        onMessageReact={onMessageReact}
        onMessageDelete={onMessageDelete}
        onSend={onSend}
      />
    </div>
  );
};

ThreadPanel.displayName = 'ThreadPanel';
