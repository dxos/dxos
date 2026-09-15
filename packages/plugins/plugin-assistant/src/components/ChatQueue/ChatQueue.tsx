//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { Message } from '@dxos/types';

import { meta } from '#meta';

export type ChatQueueProps = ThemedClassName<{
  /** Queued input awaiting processing, in append order. */
  messages: readonly Message.Message[];
  onCancel?: (message: Message.Message) => void;
}>;

/**
 * Stack of prompts the agent has not taken up yet, rendered above the composer.
 *
 * Queued input is durable feed state rather than a client-side buffer, so it survives a reload and
 * shows on every peer; cancelling removes the record, which is what takes it out of the queue.
 */
export const ChatQueue = ({ classNames, messages, onCancel }: ChatQueueProps) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <Listbox.Root>
      <Listbox.Content classNames={['w-full gap-1 items-end', classNames]}>
        {messages.map((message) => (
          <QueuedItem key={message.id} message={message} onCancel={onCancel} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

type QueuedItemProps = {
  message: Message.Message;
  onCancel?: (message: Message.Message) => void;
};

const QueuedItem = ({ message, onCancel }: QueuedItemProps) => {
  const { t } = useTranslation(meta.profile.key);

  const handleCancel = useCallback(() => {
    onCancel?.(message);
  }, [message, onCancel]);

  return (
    <Listbox.Item
      id={message.id}
      data-testid='assistant.queued-message'
      classNames='w-fit max-w-[85%] ps-2 pe-1 gap-2 rounded-sm bg-group-surface text-description text-sm'
    >
      {/* `min-w-0` is what lets the span shrink so `truncate` clips its tail; without it the row
          overflows its max-width and the start of the prompt is what gets cut. */}
      <span className='min-w-0 truncate'>{Message.extractText(message)}</span>
      {onCancel && (
        <IconButton
          iconOnly
          icon='ph--x--regular'
          variant='ghost'
          density='sm'
          data-testid='assistant.queued-message.cancel'
          label={t('cancel-queued.button')}
          onClick={handleCancel}
        />
      )}
    </Listbox.Item>
  );
};
