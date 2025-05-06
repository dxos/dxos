//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { Avatar } from '@dxos/react-ui';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type MessageType } from '@dxos/schema';
import { getFirstTwoRenderableChars, toHue } from '@dxos/util';

import { INBOX_PLUGIN } from '../../meta';
import { formatDate, hashString } from '../util';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

export type MessageHeaderProps = ThemedClassName<{
  message: MessageType;
  viewMode?: ViewMode;
  // TODO(wittjosiah): This should probably be on hover.
  onSenderClick?: () => void;
}>;

// TODO(wittjosiah): Is there a better way hook up the popover than ref drilling?
export const MessageHeader = forwardRef<HTMLDivElement, MessageHeaderProps>(
  ({ message, viewMode, onSenderClick }, ref) => {
    const { t } = useTranslation(INBOX_PLUGIN);

    return (
      <div className='grid grid-flow-row pli-2 plb-2 bs-[56px] gap-2 min-bs-0 border-be border-separator'>
        <div ref={ref} className='grid grid-cols-[auto_1fr_auto] gap-x-3'>
          <Avatar.Root>
            <Avatar.Content
              hue={message.sender.name ? toHue(hashString(message.sender.name)) : undefined}
              hueVariant='surface'
              variant='square'
              size={8}
              fallback={message.sender.name ? getFirstTwoRenderableChars(message.sender.name).join('') : '?'}
              classNames='cursor-pointer'
              onClick={onSenderClick}
            />
            <Avatar.Label srOnly>{message.sender.name || 'Unknown'}</Avatar.Label>
          </Avatar.Root>
          <div className='grid gap-0.5 self-center cursor-pointer' onClick={onSenderClick}>
            <h3 className='truncate'>{message.sender.name || 'Unknown'}</h3>
            {message.sender.email && <div className='text-xs text-description truncate'>{message.sender.email}</div>}
          </div>
          <div className='grid gap-1 justify-items-end'>
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
      </div>
    );
  },
);
