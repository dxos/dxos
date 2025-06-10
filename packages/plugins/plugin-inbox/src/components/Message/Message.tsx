//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorContent,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { MessageHeader } from './MessageHeader';
import { type ViewMode } from './MessageHeader';

export type MessageProps = ThemedClassName<{
  space?: Space;
  message: DataType.Message;
  viewMode: ViewMode;
  hasEnrichedContent: boolean;
  contactDxn?: string;
}>;

export const Message = ({ space, message, viewMode, contactDxn, classNames }: MessageProps) => {
  const client = useClient();
  const { themeMode } = useThemeContext();

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
        createThemeExtensions({ themeMode, slots: { content: { className: editorContent } } }),
        decorateMarkdown(),
        preview(),
      ];
    }
    return [];
  }, [space, client, themeMode]);

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return (
    <div role='none' className='grid grid-rows-[min-content_1fr]'>
      <MessageHeader message={message} viewMode={viewMode} contactDxn={contactDxn} />
      <div role='none' className='relative'>
        <div
          role='none'
          ref={parentRef}
          className={mx('absolute inset-0', classNames)}
          data-popover-collision-boundary={true}
        />
      </div>
    </div>
  );
};
