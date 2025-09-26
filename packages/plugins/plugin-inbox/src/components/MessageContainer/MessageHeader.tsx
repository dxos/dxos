//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Avatar, Button, DxAnchorActivate, Icon } from '@dxos/react-ui';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { meta } from '../../meta';
import { formatDate } from '../util';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

export type MessageHeaderProps = ThemedClassName<{
  message: DataType.Message;
  viewMode?: ViewMode;
  contactDxn?: string;
}>;

export const MessageHeader = ({ message, viewMode, contactDxn }: MessageHeaderProps) => {
  const { t } = useTranslation(meta.id);

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

  // TODO(burdon): Subject?
  const SenderRoot = contactDxn ? Button : 'div';
  const senderProps = contactDxn
    ? { variant: 'ghost', classNames: 'pli-2 gap-2 text-start', onClick: handleSenderClick }
    : { className: 'p-0 hover:bg-transparent', 'data-variant': 'ghost' };

  return (
    <div className='flex border-be border-subduedSeparator'>
      <Avatar.Root>
        <div className={mx('is-full p-2')}>
          {/* <SenderRoot {...(senderProps as any)}>
            <div role='none' className='p-1'>
              <Avatar.Content
                fallback={message.sender.name ? getFirstTwoRenderableChars(message.sender.name).join('') : '?'}
                hue={toHue(hashString(message.sender?.name ?? message.sender?.email))}
                hueVariant='surface'
                variant='square'
                size={10}
              />
            </div>
          </SenderRoot> */}
          <div role='none'>
            <Avatar.Label classNames='flex items-center gap-1'>
              <h3 className='text-lg truncate'>{message.sender.name || 'Unknown'}</h3>
              {contactDxn && <Icon icon='ph--caret-down--bold' size={3} />}
            </Avatar.Label>
            {message.sender.email && <div className='text-sm text-description truncate'>{message.sender.email}</div>}
          </div>
        </div>

        <div className='grid justify-items-end'>
          <div className='whitespace-nowrap text-sm text-description p-1'>
            {message.created && formatDate(new Date(), new Date(message.created))}
          </div>

          {/* View mode indicator. */}
          {viewMode && (
            <div className='p-1'>
              <span className='dx-tag' data-hue={viewMode === 'enriched' ? 'emerald' : 'neutral'}>
                {viewMode === 'plain' && t('message header view mode plain')}
                {viewMode === 'enriched' && t('message header view mode enriched')}
                {viewMode === 'plain-only' && t('message header view mode plain only')}
              </span>
            </div>
          )}
        </div>
      </Avatar.Root>
    </div>
  );
};
