//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { ElevationProvider } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type MessageType } from '@dxos/schema';

import { Message } from './Message';
import { type ViewMode } from './MessageHeader';
import { useMessageToolbarActions, useMessageToolbarAction } from './toolbar';
import { type MailboxType } from '../../types';

export type MessageContainerProps = {
  space?: Space;
  message: MessageType;
  inMailbox: MailboxType;
};

export const MessageContainer = ({ space, message, inMailbox }: MessageContainerProps) => {
  const [plainView, setPlainView] = useState(false);

  // Check if message has enriched content
  const hasEnrichedContent = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  }, [message]);

  // Calculate view mode based on plainView setting and hasEnrichedContent
  const viewMode = useMemo<ViewMode>(() => {
    if (plainView) {
      return hasEnrichedContent ? 'plain' : 'plain-only';
    }
    return hasEnrichedContent ? 'enriched' : 'plain-only';
  }, [plainView, hasEnrichedContent]);

  const menu = useMessageToolbarActions(plainView, hasEnrichedContent);
  const handleToolbarAction = useMessageToolbarAction({
    plainView,
    setPlainView: (value) => {
      return setPlainView(value);
    },
  });

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
        <Message space={space} message={message} viewMode={viewMode} hasEnrichedContent={hasEnrichedContent} />
      </div>
    </StackItem.Content>
  );
};
