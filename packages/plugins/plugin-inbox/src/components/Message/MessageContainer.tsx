//
// Copyright 2025 DXOS.org
//

import { useSignal } from '@preact/signals-react';
import React, { useMemo, useCallback } from 'react';

import { fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { ElevationProvider } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { type MenuActionHandler } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type MessageType } from '@dxos/schema';

import { Message } from './Message';
import { type ViewMode } from './MessageHeader';
import { useMessageToolbarActions, type MessageToolbarAction } from './toolbar';
import { type MailboxType } from '../../types';

export type MessageContainerProps = {
  space?: Space;
  message: MessageType;
  inMailbox: MailboxType;
};

export const MessageContainer = ({ space, message, inMailbox }: MessageContainerProps) => {
  const hasEnrichedContent = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  }, [message]);

  const initialViewMode = useMemo<ViewMode>(() => {
    return hasEnrichedContent ? 'enriched' : 'plain-only';
  }, [hasEnrichedContent]);

  const viewMode = useSignal<ViewMode>(initialViewMode);

  const menu = useMessageToolbarActions(viewMode, hasEnrichedContent);

  const handleToolbarAction = useCallback<MenuActionHandler<MessageToolbarAction>>(
    (action: MessageToolbarAction) => {
      switch (action.properties.type) {
        case 'viewMode': {
          const isPlainView = viewMode.value === 'plain' || viewMode.value === 'plain-only';
          const hasEnrichedContent = viewMode.value !== 'plain-only';
          if (hasEnrichedContent) {
            viewMode.value = isPlainView ? 'enriched' : 'plain';
          }
          break;
        }
      }
    },
    [viewMode],
  );

  return (
    <StackItem.Content classNames='relative'>
      <div role='none' className='grid grid-rows-[min-content_1fr]'>
        <div role='none' className={stackItemContentToolbarClassNames('section')}>
          <ElevationProvider elevation='positioned'>
            <MenuProvider {...menu} attendableId={fullyQualifiedId(inMailbox)} onAction={handleToolbarAction}>
              <ToolbarMenu />
            </MenuProvider>
          </ElevationProvider>
        </div>
        <Message space={space} message={message} viewMode={viewMode.value} hasEnrichedContent={hasEnrichedContent} />
      </div>
    </StackItem.Content>
  );
};
