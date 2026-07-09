//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useReducer } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Tag } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { normalizeText } from '@dxos/markdown';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Card, Icon, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { TagIndex } from '@dxos/schema';
import { type Actor, ContentBlock } from '@dxos/types';

import { InboxCapabilities, Mailbox, Starred } from '#types';

import { useExtractedObjects, useMessageTags } from '../../hooks';
import { formatDateTime } from '../../util';
import { Header } from '../Header';
import { HtmlViewer } from '../HtmlViewer';
import { MarkdownViewer } from '../MarkdownViewer';
import { Row } from '../Row';
import { type ViewMode } from '../ViewMode';
import { useMessageActions } from './useToolbar';

//
// Context
//

// TODO(burdon): Create pattern for 1-up.
type MessageContextValue = {
  attendableId?: string;
  viewMode: ViewMode;
  /** Omit to make the body read-only: the toolbar then hides its view-mode switcher. */
  setViewMode?: (mode: ViewMode) => void;
  message: Mailbox.MessageLike;
  /** Owning mailbox; enables starring (the message's tag association lives in the mailbox's tag index). */
  mailbox?: Mailbox.Mailbox;
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

// Stable fallback so `useAtomValue` always receives an atom when the message isn't starrable.
const NOT_STARRED = Atom.make(false);

//
// Root
//

type MessageRootProps = PropsWithChildren<
  Omit<MessageContextValue, 'viewMode'> & {
    viewMode?: ViewMode;
  }
>;

const MessageRoot = ({
  children,
  viewMode = 'markdown',
  setViewMode,
  onOpen,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  ...props
}: MessageRootProps) => {
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
    loadRemoteImages,
    viewMode,
    setViewMode,
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
            role === AppSurface.Section.role ? 'grid-rows-[min-content_min-content]' : 'grid-rows-[min-content_1fr]',
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
  const { message, mailbox } = useMessageContext(MESSAGE_HEADER_NAME);
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
  const tagObjects = useQuery(db, Filter.type(Tag.Tag));
  const messageTags = useMessageTags(mailboxes, message, tagObjects);

  // Starring uses the owning mailbox's tag index (messages are feed objects). Subscribe to the index
  // via `TagIndex.atom` so the star reflects toggles immediately (membership-scoped reactivity).
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [Starred.TAG_STARRED.key]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const tagIndex = mailbox?.tags?.target;
  const starredAtom = useMemo(
    () => (tagIndex && starredUri ? TagIndex.atom(tagIndex, message.id, starredUri) : NOT_STARRED),
    [tagIndex, message.id, starredUri],
  );
  const starred = useAtomValue(starredAtom);
  const handleToggleStar = useCallback(() => {
    if (mailbox && db) {
      void Starred.toggleStarred(mailbox, message, db);
    }
  }, [mailbox, message, db]);

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
    <Header.Root data-testid='message-header'>
      {/* Subject row. */}
      <Card.Row>
        <Card.Block>
          {mailbox ? (
            <Row.Star starred={starred} onToggle={handleToggleStar} />
          ) : (
            <Icon icon='ph--envelope-open--regular' />
          )}
        </Card.Block>
        <div className='flex items-center'>
          <h2 className='text-lg line-clamp-2'>{message.properties?.subject}</h2>
        </div>
      </Card.Row>

      {/* Sender row. */}
      {/* TODO(burdon): List other To/CC/BCC (Message schema only models `sender` today). */}
      <Row.Person actor={message.sender} role='from' db={db} onContactCreate={onContactCreate} />

      <Card.Row>
        {message.created && (
          <div className='whitespace-nowrap text-sm text-description'>
            {formatDateTime(new Date(message.created), new Date())}
          </div>
        )}
      </Card.Row>

      {/* Per-relation rows — one per ECHO object the message produced (Trip, Person, …). */}
      {objects.map((object) => (
        <Row.Ref key={Obj.getURI(object).toString()} object={object} />
      ))}

      {/* Tags row — Gmail-synced provider labels and user-applied tags. */}
      <Row.Tags tags={messageTags} />
    </Header.Root>
  );
};

MessageHeader.displayName = MESSAGE_HEADER_NAME;

//
// Content
//

const MESSAGE_CONTENT_NAME = 'Message.Content';

type MessageBodyProps = ThemedClassName;

const MessageBody = ({ classNames }: MessageBodyProps) => {
  const { message, mailbox, viewMode } = useMessageContext(MESSAGE_CONTENT_NAME);
  // Settings capability is optional — the Message component can be rendered in contexts (e.g.,
  // standalone storybook) where plugin-inbox isn't fully installed. Fall back to safe defaults.
  const settingsAtoms = useCapabilities(InboxCapabilities.Settings);
  const settingsAtom = settingsAtoms[0];
  const settings = useAtomValue(settingsAtom ?? FALLBACK_SETTINGS_ATOM);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  // Person-to-person mail carries a provider "personal" tag (e.g. Gmail's "Personal" category,
  // persisted into the mailbox tag index during label sync); used to decide how aggressively the
  // HTML view restyles the body.
  const db = getSpace(mailbox ?? message)?.db;
  const personalTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [...Mailbox.PERSONAL_TAG_KEYS]))[0];
  const isPersonal = useMemo(
    () =>
      !!(mailbox && personalTag && Mailbox.getTagsForMessage(mailbox, message).includes(Mailbox.tagUri(personalTag))),
    [mailbox, message, personalTag],
  );

  // Content blocks are typed by mimeType: `text/html` (raw email HTML), `text/markdown` (an authored
  // markdown rendering), `text/plain` or untyped (plaintext). The markdown view prefers an authored
  // markdown block, else converts the HTML in-memory, else falls back to the plaintext.
  const { html, markdown } = useMemo(() => {
    const textBlocks = message.blocks.filter((block): block is ContentBlock.Text => block._tag === 'text');
    const htmlText = textBlocks.find((block) => block.mimeType === 'text/html')?.text ?? '';
    const markdownBlock = textBlocks.find((block) => block.mimeType === 'text/markdown')?.text;
    const plainText = textBlocks.find((block) => block.mimeType == null || block.mimeType === 'text/plain')?.text ?? '';
    return { html: htmlText, markdown: markdownBlock ?? (htmlText ? normalizeText(htmlText) : plainText) };
  }, [message.blocks]);

  // The HTML view needs an html block; without one (e.g. a markdown-only body) fall through to the
  // markdown renderer.
  if (viewMode === 'html' && html) {
    return (
      <HtmlViewer classNames={classNames} html={html} loadRemoteImages={loadRemoteImages} isPersonal={isPersonal} />
    );
  }

  return (
    <MarkdownViewer
      classNames={classNames}
      content={markdown}
      markdown={viewMode !== 'plain'}
      loadRemoteImages={loadRemoteImages}
      slots={{ content: { className: 'mx-4!' } }}
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

export type { MessageBodyProps, MessageHeaderProps, MessageRootProps, MessageViewportProps };
