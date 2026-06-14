//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Filter, Obj, Tag as EchoTag } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Card, Icon, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { type Actor, type Message as MessageType } from '@dxos/types';

import { InboxCapabilities, Mailbox } from '#types';

import { useExtractedObjects } from '../../hooks';
import { formatDateTime } from '../../util';
import { Header } from '../Header';
import { MarkdownViewer } from '../MarkdownViewer';
import { type ViewMode } from '../ViewMode';
import { useMessageActions } from './useToolbar';

//
// Context
//

// TODO(burdon): Create pattern for 1-up.
type MessageContextValue = {
  attendableId?: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  message: MessageType.Message;
  sender: EID.EID | undefined;
  onOpen?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
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
  Omit<MessageContextValue, 'viewMode' | 'setViewMode'> & {
    viewMode?: ViewMode;
  }
>;

const MessageRoot = ({
  children,
  viewMode: viewModeProp = 'markdown',
  onOpen,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  ...props
}: MessageRootProps) => {
  const [viewMode, setViewMode] = useState(viewModeProp);

  return (
    <MessageContextProvider
      viewMode={viewMode}
      setViewMode={setViewMode}
      onOpen={onOpen}
      onReply={onReply}
      onReplyAll={onReplyAll}
      onForward={onForward}
      onDelete={onDelete}
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
  const { attendableId, message, viewMode, setViewMode, onOpen, onReply, onReplyAll, onForward, onDelete } =
    useMessageContext(MESSAGE_TOOLBAR_NAME);

  // Settings capability is optional (see MessageBody); fall back to safe defaults outside the plugin.
  const settingsAtoms = useCapabilities(InboxCapabilities.Settings);
  const settingsAtom = settingsAtoms[0] ?? FALLBACK_SETTINGS_ATOM;
  const settings = useAtomValue(settingsAtom);
  const setSettings = useAtomSet(settingsAtom);
  const loadRemoteImages = settings.loadRemoteImages ?? false;
  const onToggleLoadImages = useCallback(
    () => setSettings((prev) => ({ ...prev, loadRemoteImages: !(prev.loadRemoteImages ?? false) })),
    [setSettings],
  );

  // Optional: the graph capability isn't present in standalone (no-graph-plugin) stories.
  const graph = useCapabilities(AppCapabilities.AppGraph)[0]?.graph;
  const menuActions = useMessageActions({
    graph,
    nodeId: attendableId,
    message,
    viewMode,
    setViewMode,
    loadRemoteImages,
    onToggleLoadImages,
    onOpen,
    onReply,
    onReplyAll,
    onForward,
    onDelete,
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
  const { message } = useMessageContext(MESSAGE_HEADER_NAME);
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

  // Resolve the message's tag uris (from the Mailbox tag index) to Tag objects for label/hue.
  const tagObjects = useQuery(db, Filter.type(EchoTag.Tag));
  const tagByUri = new Map(tagObjects.map((tag) => [Obj.getURI(tag).toString(), tag]));
  const tagUris = mailboxes.flatMap((mailbox) => Mailbox.getTagsForMessage(mailbox, message));
  const tags = [...new Set(tagUris)].flatMap((uri) => {
    const tag = tagByUri.get(uri);
    return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
  });

  // Merge objects from `ExtractedFrom` relations (live space-db sources) with those recorded on
  // the Mailbox keyed by message id (feed-stored sources, which can't be relation endpoints),
  // deduped by id. The recorded ids reference space-db objects resolved via `getObjectById`.
  const objects = useMemo(() => {
    const byId = new Map<string, Obj.Any>(relationObjects.map((object) => [object.id, object]));
    for (const id of mailboxes.flatMap((mailbox) => Mailbox.getExtractedObjectIds(mailbox, message.id))) {
      if (!byId.has(id)) {
        const object = db?.query(Filter.id(id)).runSync()[0];
        if (object) {
          byId.set(id, object);
        }
      }
    }
    return [...byId.values()];
  }, [relationObjects, mailboxes, message.id, db]);

  return (
    <Card.Root border={false} fullWidth classNames='p-1 border-b border-subdued-separator' data-testid='message-header'>
      <Card.Body>
        {/* Subject row. */}
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--envelope-open--regular' />
          </Card.Block>
          <div className='flex flex-col gap-1 overflow-hidden'>
            <h2 className='text-lg line-clamp-2'>{message.properties?.subject}</h2>
            {message.created && (
              <div className='whitespace-nowrap text-sm text-description'>
                {formatDateTime(new Date(message.created), new Date())}
              </div>
            )}
          </div>
        </Card.Row>

        {/* Sender row. */}
        {/* TODO(burdon): List other To/CC/BCC. */}
        <Header.PersonRow actor={message.sender} db={db} onContactCreate={onContactCreate} />

        {/* Per-relation rows — one per ECHO object the message produced (Trip, Person, …). */}
        {objects.map((object) => (
          <Header.ObjectRow key={Obj.getURI(object).toString()} object={object} />
        ))}

        {/* Tags row — Gmail-synced provider labels and user-applied tags. */}
        <Header.TagsRow tags={tags} />
      </Card.Body>
    </Card.Root>
  );
};

MessageHeader.displayName = MESSAGE_HEADER_NAME;

//
// Content
//

const MESSAGE_CONTENT_NAME = 'Message.Content';

type MessageBodyProps = ThemedClassName;

const MessageBody = ({ classNames }: MessageBodyProps) => {
  const { message, viewMode } = useMessageContext(MESSAGE_CONTENT_NAME);
  // Settings capability is optional — the Message component can be rendered in contexts (e.g.,
  // standalone storybook) where plugin-inbox isn't fully installed. Fall back to safe defaults.
  const settingsAtoms = useCapabilities(InboxCapabilities.Settings);
  const settingsAtom = settingsAtoms[0];
  const settings = useAtomValue(settingsAtom ?? FALLBACK_SETTINGS_ATOM);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  // Enriched view shows the second (enriched) block; markdown and plain views show the first block.
  const content = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return (viewMode === 'enriched' ? textBlocks[1]?.text : textBlocks[0]?.text) || '';
  }, [message.blocks, viewMode]);

  return (
    <MarkdownViewer
      content={content}
      markdown={viewMode !== 'plain'}
      loadRemoteImages={loadRemoteImages}
      slots={{ content: { className: 'mx-4!' } }}
      classNames={classNames}
    />
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
