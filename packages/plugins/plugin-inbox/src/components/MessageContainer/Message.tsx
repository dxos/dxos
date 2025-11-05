//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { MessageHeader } from './MessageHeader';
import { type ViewMode } from './MessageHeader';

export type MessageProps = ThemedClassName<{
  space?: Space;
  message: DataType.Message.Message;
  viewMode: ViewMode;
  hasEnrichedContent: boolean;
  contactDxn?: string;
  role?: string;
}>;

export const Message = ({ space, message, viewMode, contactDxn, role, classNames }: MessageProps) => {
  const { themeMode } = useThemeContext();
  const client = useClient();

  const content = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    // If we're in plain-only mode or plain view, show the first block.
    if (viewMode === 'plain-only' || viewMode === 'plain') {
      return textBlocks[0]?.text || '';
    }

    // Otherwise show enriched content (second block).
    return textBlocks[1]?.text || '';
  }, [message.blocks, viewMode]);

  const extensions = useMemo(() => {
    if (space) {
      return [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createThemeExtensions({ themeMode, slots: {} }),
        createMarkdownExtensions(),
        decorateMarkdown({
          skip: (node) => (node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:'),
        }),
        preview(),
      ];
    }
    return [];
  }, [space, client, themeMode]);

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return (
    <div
      role='none'
      className={mx(
        'overflow-hidden grid',
        role === 'section' ? 'grid-rows-[min-content_min-content]' : 'grid-rows-[min-content_1fr]',
      )}
    >
      <MessageHeader message={message} viewMode={viewMode} contact={contactDxn} />
      <div role='none' className={mx(role === 'section' ? 'contents' : 'p-2 overflow-hidden')}>
        <div
          role='none'
          ref={parentRef}
          className={mx(role !== 'section' && 'flex bs-full overflow-hidden', classNames)}
          data-popover-collision-boundary={true}
        />
      </div>
    </div>
  );
};
