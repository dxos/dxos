//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type EchoURI } from '@dxos/keys';
import { Icon, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { Menu } from '@dxos/react-ui-menu';
import { type Actor, type Message as MessageType } from '@dxos/types';
import {
  EditorView,
  compactSlots,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { InboxCapabilities } from '#types';

import { formatDateTime } from '../../util';
import { UserIconButton } from '../UserIconButton';
import { type RenderMode, type ViewMode, useMessageActions } from './useToolbar';

//
// Context
//

// TODO(burdon): Create pattern for 1-up.
type MessageContextValue = {
  attendableId?: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;
  message: MessageType.Message;
  sender: EchoURI.EchoURI | undefined;
  onOpen?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
};

const [MessageContextProvider, useMessageContext] = createContext<MessageContextValue>('Message');

// Fallback used when the optional InboxCapabilities.Settings capability is not installed
// (e.g., in standalone storybook contexts). Keeps Message renderable without the plugin manager
// providing settings.
const FALLBACK_SETTINGS_ATOM = Atom.make({ loadRemoteImages: false });

//
// Root
//

type MessageRootProps = PropsWithChildren<
  Omit<MessageContextValue, 'viewMode' | 'setViewMode' | 'renderMode' | 'setRenderMode'> & {
    viewMode?: ViewMode;
    renderMode?: RenderMode;
  }
>;

const MessageRoot = ({
  children,
  viewMode: viewModeProp = 'plain',
  renderMode: renderModeProp = 'markdown',
  onOpen,
  onReply,
  onReplyAll,
  onForward,
  ...props
}: MessageRootProps) => {
  const [viewMode, setViewMode] = useState(viewModeProp);
  const [renderMode, setRenderMode] = useState(renderModeProp);

  return (
    <MessageContextProvider
      viewMode={viewMode}
      setViewMode={setViewMode}
      renderMode={renderMode}
      setRenderMode={setRenderMode}
      onOpen={onOpen}
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

const MessageToolbar = composable<HTMLDivElement>((props, forwardedRef) => {
  const {
    attendableId,
    message,
    viewMode,
    setViewMode,
    renderMode,
    setRenderMode,
    onOpen,
    onReply,
    onReplyAll,
    onForward,
  } = useMessageContext(MESSAGE_TOOLBAR_NAME);
  const menuActions = useMessageActions({
    message,
    viewMode,
    setViewMode,
    renderMode,
    setRenderMode,
    onOpen,
    onReply,
    onReplyAll,
    onForward,
  });

  return (
    <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive>
      <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
    </Menu.Root>
  );
});

MessageToolbar.displayName = MESSAGE_TOOLBAR_NAME;

//
// Viewport
//

const MESSAGE_VIEWPORT_NAME = 'Message.Viewport';

type MessageViewportProps = ThemedClassName<PropsWithChildren>;

const MessageViewport = composable<HTMLDivElement, MessageViewportProps>(
  ({ children, role, ...props }, forwardedRef) => {
    return (
      <div
        {...composableProps(props, {
          role: 'none',
          classNames: [
            'overflow-hidden grid',
            role === 'section' ? 'grid-rows-[min-content_min-content]' : 'grid-rows-[min-content_1fr]',
          ],
        })}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

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
    <div className='p-1 flex flex-col gap-2 border-b border-subdued-separator'>
      <div className='grid grid-cols-[2rem_1fr] gap-1'>
        <div className='flex px-2 pt-1.5 text-subdued'>
          <Icon icon='ph--envelope-open--regular' />
        </div>
        <div className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{message.properties?.subject}</h2>
          <div className='whitespace-nowrap text-sm text-description'>
            {message.created && formatDateTime(new Date(message.created), new Date())}
          </div>
        </div>
      </div>

      {/* TODO(burdon): List other To/CC/BCC. */}
      <div>
        <div className='grid grid-cols-[2rem_1fr] gap-1 items-center'>
          <UserIconButton
            title={message.sender.name}
            value={sender}
            onContactCreate={() => onContactCreate?.(message.sender)}
          />
          <h3 className='truncate text-primary-text'>{message.sender.name || message.sender.email}</h3>
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

type MessageBodyProps = ThemedClassName;

const MessageBody = ({ classNames }: MessageBodyProps) => {
  const { message, viewMode, renderMode } = useMessageContext(MESSAGE_CONTENT_NAME);
  const { themeMode } = useThemeContext();
  // Settings capability is optional — the Message component can be rendered in contexts (e.g.,
  // standalone storybook) where plugin-inbox isn't fully installed. Fall back to safe defaults.
  const settingsAtoms = useCapabilities(InboxCapabilities.Settings);
  const settingsAtom = settingsAtoms[0];
  const settings = useAtomValue(settingsAtom ?? FALLBACK_SETTINGS_ATOM);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

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
    const exts = [
      createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
      createThemeExtensions({ themeMode, slots: compactSlots }),
    ];
    if (renderMode === 'markdown') {
      exts.push(
        createMarkdownExtensions(),
        decorateMarkdown({
          skip: (node) => {
            // Skip dxn: links and images entirely (handled by preview()).
            if ((node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:')) {
              return true;
            }
            // When remote-image loading is disabled, suppress http(s) image rendering;
            // the markdown source is left visible as a plain link instead.
            if (node.name === 'Image' && /^https?:\/\//.test(node.url) && !loadRemoteImages) {
              return true;
            }
            return false;
          },
        }),
        preview(),
        EditorView.domEventHandlers({
          click: (event) => {
            const anchor = (event.target as Element | null)?.closest('a.cm-link') as HTMLAnchorElement | null;
            if (anchor?.href) {
              event.preventDefault();
              window.open(anchor.href, '_blank', 'noopener,noreferrer');
              return true;
            }
            return false;
          },
        }),
      );
    }
    return exts;
  }, [themeMode, renderMode, loadRemoteImages]);

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return (
    <div className={mx('flex overflow-hidden', classNames)} data-popover-collision-boundary={true} ref={parentRef} />
  );
};

MessageBody.displayName = MESSAGE_CONTENT_NAME;

//
// Message
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Message = {
  Root: MessageRoot,
  Toolbar: MessageToolbar,
  Viewport: MessageViewport,
  Header: MessageHeader,
  Body: MessageBody,
};

export type { MessageRootProps, MessageViewportProps, MessageHeaderProps, MessageBodyProps };
