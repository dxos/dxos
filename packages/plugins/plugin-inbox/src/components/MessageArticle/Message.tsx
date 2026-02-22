//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo, useState } from 'react';

import { type DXN } from '@dxos/echo';
import { Icon, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { type Actor, type Message as MessageType } from '@dxos/types';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { formatDateTime } from '../../util';
import { UserIconButton } from '../common';

import { type ViewMode, useMessageToolbarActions } from './useToolbar';

//
// Context
//

// TODO(burdon): Create pattern for 1-up.
type MessageContextValue = {
  attendableId?: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  message: MessageType.Message;
  sender: DXN | undefined;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
};

const [MessageContextProvider, useMessageContext] = createContext<MessageContextValue>('Message');

//
// Root
//

type MessageRootProps = PropsWithChildren<
  Omit<MessageContextValue, 'viewMode' | 'setViewMode'> & { viewMode?: ViewMode }
>;

const MessageRoot = ({
  children,
  viewMode: viewModeProp = 'plain',
  onReply,
  onReplyAll,
  onForward,
  ...props
}: MessageRootProps) => {
  const [viewMode, setViewMode] = useState(viewModeProp);

  return (
    <MessageContextProvider
      viewMode={viewMode}
      setViewMode={setViewMode}
      onReply={onReply}
      onReplyAll={onReplyAll}
      onForward={onForward}
      {...props}
    >
      {children}
    </MessageContextProvider>
  );
};

MessageRoot.displayName = 'Message.Root';

//
// Toolbar
//

const MESSAGE_TOOLBAR_NAME = 'Message.Toolbar';

type MessageToolbarProps = ThemedClassName<{}>;

export const MessageToolbar = ({ classNames }: MessageToolbarProps) => {
  const { attendableId, viewMode, setViewMode, onReply, onReplyAll, onForward } =
    useMessageContext(MESSAGE_TOOLBAR_NAME);
  const actions = useMessageToolbarActions({ viewMode, setViewMode, onReply, onReplyAll, onForward });

  return (
    <MenuProvider {...actions} attendableId={attendableId}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};

MessageToolbar.displayName = MESSAGE_TOOLBAR_NAME;

//
// Viewport
//

const MESSAGE_VIEWPORT_NAME = 'Message.Viewport';

type MessageViewportProps = ThemedClassName<PropsWithChildren<{ role?: string }>>;

const MessageViewport = ({ classNames, children, role }: MessageViewportProps) => {
  return (
    <div
      role='none'
      className={mx(
        'overflow-hidden grid',
        role === 'section' ? 'grid-rows-[min-content_min-content]' : 'grid-rows-[min-content_1fr]',
        classNames,
      )}
    >
      {children}
    </div>
  );
};

MessageViewport.displayName = MESSAGE_VIEWPORT_NAME;

//
// Header
//

const MESSAGE_HEADER_NAME = 'Message.Header';

type MessageHeaderProps = ThemedClassName<{
  onContactCreate?: (actor: Actor.Actor) => void;
}>;

const MessageHeader = ({ onContactCreate }: MessageHeaderProps) => {
  const { message, sender } = useMessageContext(MESSAGE_HEADER_NAME);

  return (
    <div role='none' className='p-1 flex flex-col gap-2 border-be border-subduedSeparator'>
      <div role='none' className='grid grid-cols-[2rem_1fr] gap-1'>
        <div role='none' className='flex px-2 pbs-1.5 text-subdued'>
          <Icon icon='ph--envelope-open--regular' />
        </div>
        <div role='none' className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{message.properties?.subject}</h2>
          <div role='none' className='whitespace-nowrap text-sm text-description'>
            {message.created && formatDateTime(new Date(), new Date(message.created))}
          </div>
        </div>
      </div>

      {/* TODO(burdon): List other To/CC/BCC. */}
      <div role='none'>
        <div role='none' className='grid grid-cols-[2rem_1fr] gap-1 items-center'>
          <UserIconButton
            title={message.sender.name}
            value={sender}
            onContactCreate={() => onContactCreate?.(message.sender)}
          />
          <h3 className='truncate text-primaryText'>{message.sender.name || message.sender.email}</h3>
        </div>
      </div>
    </div>
  );
};

MessageHeader.displayName = MESSAGE_HEADER_NAME;

//
// Content
//

const MESSAGE_CONTENT_NAME = 'Message.Content';

type MessageContentProps = ThemedClassName<{}>;

const MessageContent = ({ classNames }: MessageContentProps) => {
  const { message, viewMode } = useMessageContext(MESSAGE_CONTENT_NAME);
  const { themeMode } = useThemeContext();

  // If we're in plain-only mode or plain view, show the first block.
  // Otherwise show enriched content (second block).
  const content = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    if (viewMode === 'plain-only' || viewMode === 'plain') {
      return textBlocks[0]?.text || '';
    }

    return textBlocks[1]?.text || '';
  }, [message.blocks, viewMode]);

  const extensions = useMemo(() => {
    return [
      createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
      createThemeExtensions({ themeMode, slots: { scroll: { className: 'p-3' } } }),
      createMarkdownExtensions(),
      decorateMarkdown({
        skip: (node) => (node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:'),
      }),
      preview(),
    ];
  }, [themeMode]);

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return (
    <div
      role='none'
      ref={parentRef}
      className={mx('flex overflow-hidden', classNames)}
      data-popover-collision-boundary={true}
    />
  );
};

MessageContent.displayName = MESSAGE_CONTENT_NAME;

//
// Message
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Message = {
  Root: MessageRoot,
  Toolbar: MessageToolbar,
  Viewport: MessageViewport,
  Header: MessageHeader,
  Content: MessageContent,
};

export type { MessageRootProps, MessageToolbarProps, MessageViewportProps, MessageHeaderProps, MessageContentProps };
