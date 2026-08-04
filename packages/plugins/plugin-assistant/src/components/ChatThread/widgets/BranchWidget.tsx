//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { type XmlWidgetProps } from '@dxos/ui-editor';

import { meta } from '#meta';

import { type MessageThreadContext } from '../sync';
import { formatTime } from './format-time';

export type BranchWidgetProps = XmlWidgetProps<
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
export const BranchWidget = ({ messageId, created, context }: BranchWidgetProps) => {
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
    <div role='toolbar' className='flex items-center p-1 gap-1 justify-end text-xs text-subdued hover:text-inherit'>
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
