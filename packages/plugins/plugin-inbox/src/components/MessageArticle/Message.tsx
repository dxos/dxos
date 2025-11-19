//
// Copyright 2025 DXOS.org
//

import { type Signal, useSignal } from '@preact/signals-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useMemo, useRef } from 'react';

import { type DXN } from '@dxos/echo';
import {
  Avatar,
  DxAnchorActivate,
  IconButton,
  type ThemedClassName,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
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

import { meta } from '../../meta';
import { formatDateTime } from '../../util';

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
// Header
//

type MessageHeaderProps = ThemedClassName;

const MessageHeader = (_props: MessageHeaderProps) => {
  const { t } = useTranslation(meta.id);
  const { message, sender, viewMode } = useMessageContext(MessageHeader.displayName);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleSenderClick = useCallback(() => {
    if (sender.value) {
      buttonRef.current?.dispatchEvent(
        new DxAnchorActivate({
          trigger: buttonRef.current,
          refId: sender.value.toString(),
          label: message.sender.name ?? 'never',
        }),
      );
    }
  }, [sender.value, message.sender.name]);

  return (
    <Avatar.Root>
      <div className='grid grid-rows-2 border-be border-subduedSeparator'>
        <div className='flex is-full'>
          <Avatar.Label classNames='flex is-full items-center gap-1 pis-2'>
            {/* TODO(burdon): Create dx-tag like border around h3 if link. */}
            {/* TODO(burdon): Colors for prominent text fields (coordinate with mailbox.css). */}
            <h3 className='text-lg truncate text-indigoText'>{message.sender.name || 'Unknown'}</h3>
            {sender && (
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
            {message.created && formatDateTime(new Date(), new Date(message.created))}
          </span>
        </div>

        <div className='flex is-full items-center'>
          <div className='flex is-full pis-2 items-center'>
            <span className='text-sm text-description truncate'>{message.sender.email}</span>
          </div>
          {viewMode.value && (
            <div className='pie-1'>
              <span className='dx-tag' data-hue={viewMode.value === 'enriched' ? 'emerald' : 'neutral'}>
                {viewMode.value === 'plain' && t('message header view mode plain')}
                {viewMode.value === 'enriched' && t('message header view mode enriched')}
                {viewMode.value === 'plain-only' && t('message header view mode plain only')}
              </span>
            </div>
          )}
        </div>

        <div className='p-2'>{message.properties?.subject}</div>
      </div>
    </Avatar.Root>
  );
};

MessageHeader.displayName = 'Message.Header';

//
// Viewport
//

type MessageViewportProps = ThemedClassName<PropsWithChildren>;

const MessageViewport = ({ classNames, children }: MessageViewportProps) => {
  return <div className={mx('flex flex-col', classNames)}>{children}</div>;
};

MessageViewport.displayName = 'Message.Viewport';

//
// Content
//

type MessageContentProps = ThemedClassName<{ role?: string }>;

const MessageContent = ({ classNames, role }: MessageContentProps) => {
  const { message, viewMode } = useMessageContext(MessageContent.displayName);
  const { themeMode } = useThemeContext();

  const content = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    // If we're in plain-only mode or plain view, show the first block.
    if (viewMode.value === 'plain-only' || viewMode.value === 'plain') {
      return textBlocks[0]?.text || '';
    }

    // Otherwise show enriched content (second block).
    return textBlocks[1]?.text || '';
  }, [message.blocks, viewMode]);

  const extensions = useMemo(() => {
    return [
      createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
      createThemeExtensions({ themeMode, slots: {} }),
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
      className={mx(
        'overflow-hidden grid',
        role === 'section' ? 'grid-rows-[min-content_min-content]' : 'grid-rows-[min-content_1fr]',
      )}
    >
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

MessageContent.displayName = 'Message.Content';

//
// Toolbar
//

type MessageToolbarProps = ThemedClassName<{ onContactCreate?: () => void }>;

export const MessageToolbar = ({ classNames, onContactCreate }: MessageToolbarProps) => {
  const { attendableId, sender, viewMode } = useMessageContext(MessageToolbar.displayName);
  const menu = useMessageToolbarActions({ viewMode, contact: sender, onContactCreate });

  return (
    <MenuProvider {...menu} attendableId={attendableId}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};

MessageToolbar.displayName = 'Message.Toolbar';

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
