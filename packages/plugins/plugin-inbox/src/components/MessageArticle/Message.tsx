//
// Copyright 2025 DXOS.org
//

import { type Signal, useSignal } from '@preact/signals-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo } from 'react';

import { type DXN } from '@dxos/echo';
import { Icon, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { mx } from '@dxos/react-ui-theme';
import { type Message as MessageType } from '@dxos/types';

import { formatDateTime } from '../../util';
import { UserIconButton } from '../UserIconButton';

import { useMessageToolbarActions } from './useToolbar';

export type ViewMode = 'plain' | 'enriched' | 'plain-only';

//
// Context
//

// TODO(burdon): Create pattern for 1-up.
// TODO(burdon): When should we internalize vs externalize signals?
type MessageContextValue = {
  attendableId?: string;
  viewMode: Signal<ViewMode>;
  message: MessageType.Message;
  sender: Signal<DXN | undefined>;
};

const [MessageContextProvider, useMessageContext] = createContext<MessageContextValue>('Message');

//
// Root
//

type MessageRootProps = PropsWithChildren<Omit<MessageContextValue, 'viewMode'> & { viewMode?: ViewMode }>;

const MessageRoot = ({ children, viewMode: viewModeParam = 'plain', ...props }: MessageRootProps) => {
  const viewMode = useSignal(viewModeParam);

  return (
    <MessageContextProvider viewMode={viewMode} {...props}>
      {children}
    </MessageContextProvider>
  );
};

MessageRoot.displayName = 'Message.Root';

//
// Toolbar
//

type MessageToolbarProps = ThemedClassName<{}>;

export const MessageToolbar = ({ classNames }: MessageToolbarProps) => {
  const { attendableId, viewMode } = useMessageContext(MessageToolbar.displayName);
  const menu = useMessageToolbarActions({ viewMode });

  return (
    <MenuProvider {...menu} attendableId={attendableId}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};

MessageToolbar.displayName = 'Message.Toolbar';

//
// Viewport
//

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

MessageViewport.displayName = 'Message.Viewport';

//
// Header
//

type MessageHeaderProps = ThemedClassName<{ onContactCreate?: () => void }>;

// TODO(burdon): Factor out header with event.
const MessageHeader = ({ onContactCreate }: MessageHeaderProps) => {
  const { message, sender } = useMessageContext(MessageHeader.displayName);

  return (
    <div className='p-1 flex flex-col gap-2 border-be border-subduedSeparator'>
      <div className='grid grid-cols-[2rem_1fr] gap-1'>
        <div className='flex pli-2 pbs-1.5 text-subdued'>
          <Icon icon='ph--envelope-open--regular' />
        </div>
        <div className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{message.properties?.subject}</h2>
          <div className='whitespace-nowrap text-sm text-description'>
            {message.created && formatDateTime(new Date(), new Date(message.created))}
          </div>
        </div>
      </div>

      {/* TODO(burdon): List From/CC. */}
      <div className='grid grid-cols-[2rem_1fr] gap-1 items-center'>
        <UserIconButton value={sender.value} onContactCreate={onContactCreate} />
        <h3 className='truncate text-primaryText'>{message.sender.name || message.sender.email}</h3>
      </div>
    </div>
  );
};

MessageHeader.displayName = 'Message.Header';

//
// Content
//

type MessageContentProps = ThemedClassName<{}>;

const MessageContent = ({ classNames }: MessageContentProps) => {
  const { message, viewMode } = useMessageContext(MessageContent.displayName);
  const { themeMode } = useThemeContext();

  // If we're in plain-only mode or plain view, show the first block.
  // Otherwise show enriched content (second block).
  const content = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    if (viewMode.value === 'plain-only' || viewMode.value === 'plain') {
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
    return [];
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

MessageContent.displayName = 'Message.Content';

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
