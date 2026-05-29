//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useEffect, useMemo, useReducer, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Filter, Obj } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Icon, IconBlock, Tag, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
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
import { mx, toHue } from '@dxos/ui-theme';

import { InboxCapabilities, Mailbox } from '#types';

import { useExtractedObjects } from '../../hooks';
import { formatDateTime } from '../../util';
import { AnchorIconButton } from '../AnchorIconButton';
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
  const space = getSpace(message);
  const db = space?.db;
  const relationObjects = useExtractedObjects(db, message);
  const mailboxes = useQuery(db, Filter.type(Mailbox.Mailbox));
  // `useQuery` only fires when the matching set changes, not when nested fields mutate.
  // Subscribe directly to each mailbox so a tag-only extractor run (no created objects,
  // no relation, just a `mailbox.tags`/`mailbox.extracted` mutation) still re-renders.
  const [, bump] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => {
    const unsubs = mailboxes.map((mailbox) => Obj.subscribe(mailbox, bump));
    return () => unsubs.forEach((unsub) => unsub());
  }, [mailboxes]);
  const tags = mailboxes.flatMap((mailbox) => Mailbox.getTagsForMessage(mailbox, message));

  // Merge objects from `ExtractedFrom` relations (live space-db sources) with those recorded on
  // the Mailbox keyed by message id (feed-stored sources, which can't be relation endpoints),
  // deduped by id. The recorded ids reference space-db objects resolved via `getObjectById`.
  const objects = useMemo(() => {
    const byId = new Map<string, Obj.Any>(relationObjects.map((object) => [object.id, object]));
    for (const id of mailboxes.flatMap((mailbox) => Mailbox.getExtractedObjectIds(mailbox, message.id))) {
      if (!byId.has(id)) {
        const object = db?.getObjectById(id);
        if (object) {
          byId.set(id, object);
        }
      }
    }
    return [...byId.values()];
  }, [relationObjects, mailboxes, message.id, db]);

  return (
    <div
      data-testid='message-header'
      className='grid grid-cols-[2rem_1fr] gap-y-0.5 gap-x-1 p-1 mb-2 border-b border-subdued-separator'
    >
      {/* Subject row. */}
      <div className='col-span-2 grid grid-cols-subgrid'>
        <IconBlock classNames='text-subdued'>
          <Icon icon='ph--envelope-open--regular' />
        </IconBlock>
        <div className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{message.properties?.subject}</h2>
          <div className='whitespace-nowrap text-sm text-description'>
            {message.created && formatDateTime(new Date(message.created), new Date())}
          </div>
        </div>
      </div>

      {/* Sender row. */}
      {/* TODO(burdon): List other To/CC/BCC. */}
      <div className='col-span-2 grid grid-cols-subgrid items-center'>
        <UserIconButton
          title={message.sender.name}
          value={sender}
          onContactCreate={() => onContactCreate?.(message.sender)}
        />
        <h3 className='truncate text-primary-text'>{message.sender.name || message.sender.email}</h3>
      </div>

      {/* Per-relation rows — one per ECHO object the message produced (Trip, Person, …). */}
      {objects.map((object) => (
        <ExtractedObjectRow key={Obj.getURI(object).toString()} object={object} />
      ))}

      {/* Tags row — Gmail-synced provider labels and user-applied tags. */}
      {tags.length > 0 && (
        <div className='col-span-2 grid grid-cols-subgrid items-center'>
          <IconBlock classNames='text-subdued'>
            <Icon icon='ph--tag--regular' />
          </IconBlock>
          <div className='flex flex-wrap gap-1 -mx-0.5' data-testid='extracted-tags'>
            {tags.map((tag) => (
              <Tag key={tag.id} palette={toHue(tag.hue)} data-testid={`message-tag-${tag.id}`}>
                {tag.label}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

MessageHeader.displayName = MESSAGE_HEADER_NAME;

const ExtractedObjectRow = ({ object }: { object: Obj.Any }) => {
  const label = Obj.getLabel(object, { fallback: 'typename' }) ?? 'object';
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  const echoUri = EchoURI.tryParse(Obj.getURI(object).toString());

  return (
    <div className='col-span-2 grid grid-cols-subgrid items-center' data-testid={`extracted-tag-${object.id}`}>
      <AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />
      <h3 className='truncate text-primary-text'>{label}</h3>
    </div>
  );
};

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
