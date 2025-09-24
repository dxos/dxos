//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Avatar, Button, DxAnchorActivate, Icon } from '@dxos/react-ui';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type DataType } from '@dxos/schema';
import { getFirstTwoRenderableChars, toHue } from '@dxos/util';

import { INBOX_PLUGIN } from '../../meta';
import { formatDate, hashString } from '../util';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

export type MessageHeaderProps = ThemedClassName<{
  message: DataType.Message;
  viewMode?: ViewMode;
  contactDxn?: string;
}>;

export const MessageHeader = ({ message, viewMode, contactDxn }: MessageHeaderProps) => {
  const { t } = useTranslation(INBOX_PLUGIN);

  const handleSenderClick = useCallback(
    (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest('.dx-button');
      if (contactDxn && button) {
        button.dispatchEvent(
          new DxAnchorActivate({
            trigger: button as HTMLElement,
            refId: contactDxn,
            label: message.sender.name ?? 'never',
          }),
        );
      }
    },
    [contactDxn, message.sender.name],
  );

  const SenderRoot = contactDxn ? Button : 'div';
  const senderProps = contactDxn
    ? { variant: 'ghost', classNames: 'pli-2 gap-2 text-start', onClick: handleSenderClick }
    : { className: 'dx-button hover:bg-transparent pli-2 gap-2', 'data-variant': 'ghost' };

  return (
    <div className='border-be border-separator p-1 flex justify-between'>
      <Avatar.Root>
        <SenderRoot {...(senderProps as any)}>
          <Avatar.Content
            hue={toHue(hashString(message.sender?.name ?? message.sender?.email))}
            hueVariant='surface'
            variant='square'
            size={8}
            fallback={message.sender.name ? getFirstTwoRenderableChars(message.sender.name).join('') : '?'}
          />
          <div role='none'>
            <Avatar.Label classNames='flex items-center gap-1'>
              <h3 className='truncate'>{message.sender.name || 'Unknown'}</h3>
              {contactDxn && <Icon icon='ph--caret-down--bold' size={3} />}
            </Avatar.Label>
            {message.sender.email && <div className='text-xs text-description truncate'>{message.sender.email}</div>}
          </div>
        </SenderRoot>
      </Avatar.Root>
      <div className='grid gap-1 justify-items-end p-1'>
        <div className='text-xs text-description'>
          {message.created && formatDate(new Date(), new Date(message.created))}
        </div>
        {/* View mode indicator */}
        {viewMode && (
          <div className='dx-tag' data-hue={viewMode === 'enriched' ? 'emerald' : 'neutral'}>
            {viewMode === 'plain' && t('message header view mode plain')}
            {viewMode === 'enriched' && t('message header view mode enriched')}
            {viewMode === 'plain-only' && t('message header view mode plain only')}
          </div>
        )}
      </div>
    </div>
  );
};
