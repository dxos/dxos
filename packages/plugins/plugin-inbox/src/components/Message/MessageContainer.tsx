//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { ElevationProvider, useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
  useTextEditor,
  stackItemContentToolbarClassNames,
} from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type MessageType } from '@dxos/schema';

import { MessageHeader } from './MessageHeader';
import { type ViewMode } from './MessageHeader';
import { useMessageToolbarActions, useMessageToolbarAction } from './toolbar';
import { type MailboxType } from '../../types';

export type MessageProps = ThemedClassName<{
  space?: Space;
  message: MessageType;
  plainView: boolean;
  hasEnrichedContent: boolean;
}>;

const Message = ({ space, message, plainView, hasEnrichedContent, classNames }: MessageProps) => {
  const client = useClient();
  const { themeMode } = useThemeContext();

  // Calculate view mode based on plainView setting and hasEnrichedContent
  const viewMode = useMemo<ViewMode>(() => {
    if (plainView) {
      return hasEnrichedContent ? 'plain' : 'plain-only';
    }
    return hasEnrichedContent ? 'enriched' : 'plain-only';
  }, [plainView, hasEnrichedContent]);

  const content = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    // If we're in plain-only mode or plain view, show the first block.
    if (viewMode === 'plain-only' || viewMode === 'plain') {
      return textBlocks[0]?.text || '';
    }
    // Otherwise show enriched content (second block).
    return textBlocks[1]?.text || '';
  }, [message.blocks, viewMode]);

  // TODO(ZaymonFC): How to prevent caret and selection?
  const extensions = useMemo(() => {
    if (space) {
      return [
        createBasicExtensions({ readOnly: true, lineWrapping: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        preview(),
      ];
    }
    return [];
  }, [space, client, themeMode]);

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return (
    <div role='none' className='grid grid-rows-[min-content_1fr] relative h-full overflow-hidden'>
      <MessageHeader message={message} viewMode={viewMode} />
      <div role='none' className='overflow-y-auto h-full min-h-0 p-2'>
        <div ref={parentRef} className={mx(classNames)} />
      </div>
    </div>
  );
};

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
        <Message space={space} message={message} plainView={plainView} hasEnrichedContent={hasEnrichedContent} />
      </div>
    </StackItem.Content>
  );
};
