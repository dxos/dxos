//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Avatar, DxAnchorActivate, IconButton } from '@dxos/react-ui';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
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

  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleSenderClick = useCallback(() => {
    if (contactDxn) {
      buttonRef.current?.dispatchEvent(
        new DxAnchorActivate({
          trigger: buttonRef.current,
          refId: contactDxn,
          label: message.sender.name ?? 'never',
        }),
      );
    }
  }, [contactDxn, message.sender.name]);

  return (
    <Avatar.Root>
      <div className='grid grid-rows-2 border-be border-subduedSeparator'>
        <div className='flex is-full'>
          <Avatar.Label classNames='flex is-full items-center gap-1 pis-2'>
            {/* TODO(burdon): Create dx-tag like border around h3 if link. */}
            <h3 className='text-lg truncate'>{message.sender.name || 'Unknown'}</h3>
            {contactDxn && (
              <IconButton
                ref={buttonRef}
                variant='ghost'
                icon='ph--caret-down--regular'
                iconOnly
                label={t('show user')}
                size={4}
                classNames='!p-0.5'
                onClick={handleSenderClick}
              />
            )}
          </Avatar.Label>
          <span className='whitespace-nowrap text-sm text-description p-1 pie-2'>
            {message.created && formatDate(new Date(), new Date(message.created))}
          </span>
        </div>

        <div className='flex is-full items-center'>
          <div className='flex is-full pis-2 items-center'>
            <span className='text-sm text-description truncate'>{message.sender.email}</span>
          </div>
          {viewMode && (
            <div className='pie-1'>
              <span className='dx-tag' data-hue={viewMode === 'enriched' ? 'emerald' : 'neutral'}>
                {viewMode === 'plain' && t('message header view mode plain')}
                {viewMode === 'enriched' && t('message header view mode enriched')}
                {viewMode === 'plain-only' && t('message header view mode plain only')}
              </span>
            </div>
          )}
        </div>

        <div className='p-2'>{message.properties?.subject}</div>
      </div>
    </Avatar.Root>
  );
};
