//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { type XmlWidgetProps } from '@dxos/ui-editor';

import { meta } from '#meta';

import { type MessageThreadContext } from '../sync';

export type RewindWidgetProps = XmlWidgetProps<
  {
    /** Id of the message to rewind to. Named to avoid colliding with the widget's own `id` prop. */
    messageId?: string;
    /** ISO timestamp of the message. */
    created?: string;
  },
  MessageThreadContext
>;

/**
 * Mini toolbar rendered below each user prompt, offering a soft fork ("rewind") back to that prompt
 * along with when it was sent.
 */
export const RewindWidget = ({ messageId, created, context }: RewindWidgetProps) => {
  const { t } = useTranslation(meta.profile.key);

  const handleRewind = useCallback(() => {
    if (messageId) {
      context?.rewind(messageId);
    }
  }, [context, messageId]);

  if (!messageId) {
    return null;
  }

  return (
    <div role='toolbar' className='flex items-center gap-1 justify-end text-xs text-subdued'>
      <IconButton
        classNames='min-h-0 p-1'
        icon='ph--clock-counter-clockwise--regular'
        iconOnly
        variant='ghost'
        size={4}
        label={t('rewind.label')}
        data-testid='chat.rewind'
        onClick={handleRewind}
      />
      {created && (
        <time dateTime={created} title={new Date(created).toLocaleString()}>
          {formatTime(created)}
        </time>
      )}
    </div>
  );
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Relative ("5 min ago", "yesterday") within two days, absolute date beyond that. The exact
 * timestamp is always available via the `title` tooltip.
 *
 * Recent prompts are the ones a reader places by elapsed time; older ones by date.
 */
export const formatTime = (created: string, now = Date.now()): string => {
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const elapsed = now - date.getTime();
  if (elapsed < 0 || elapsed >= 2 * DAY_MS) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 1) {
    // Seconds rather than `format(0, 'minute')`, which renders as "this minute".
    return format.format(-Math.max(1, Math.round(elapsed / 1000)), 'second');
  }
  if (minutes < 60) {
    return format.format(-minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return format.format(-hours, 'hour');
  }

  // `numeric: 'auto'` renders -1 day as "yesterday".
  return format.format(-Math.round(hours / 24), 'day');
};
