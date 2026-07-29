//
// Copyright 2023 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { format } from 'date-fns/format';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  Fragment,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import {
  Avatar,
  Icon,
  IconButton,
  type ThemedClassName,
  useOnTransition,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { type UseTextEditorProps, useTextEditor } from '@dxos/react-ui-editor';
import { type ContentBlock, type Message as MessageType } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, keymap, listener } from '@dxos/ui-editor';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';
import { hexToEmoji, hexToHue, isTruthy } from '@dxos/util';

import { command } from '../command';
import { useThreadContext } from '../context';
import { translationKey } from '../translations';
import { DEFAULT_REACTIONS, type MessageMetadata, type MessageReaction, type MessageThreadSummary } from '../types';

const avatarSize = 7;

const buttonGroupClassNames = 'flex flex-row items-center gap-0.5 pe-2';
const buttonClassNames = 'p-1! transition-opacity';

//
// Root
//

export type MessageRootProps = ThemedClassName<
  ComponentPropsWithRef<'div'> & MessageMetadata & Partial<{ continues: boolean; controls: ReactNode }>
>;

// TODO(burdon): Show authorName on tooltip.
const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  (
    {
      authorImgSrc,
      authorId,
      authorName,
      authorAvatarProps,
      continues = true,
      controls,
      children,
      classNames,
      ...rootProps
    },
    forwardedRef,
  ) => {
    // Must wrap the message since Avatar.Label may be used in the content.
    // Columns mirror Thread.Header (avatar/rail · content · controls) so trailing
    // controls align with the thread header's controls.
    return (
      <Avatar.Root>
        <div
          data-testid='thread.message'
          {...rootProps}
          className={mx('grid grid-cols-[var(--dx-rail-size)_1fr_min-content] w-full', classNames)}
          ref={forwardedRef}
        >
          <div className='flex flex-col items-center gap-2 pt-1'>
            <Avatar.Content
              size={avatarSize}
              hue={authorAvatarProps?.hue || hexToHue(authorId ?? '0')}
              fallback={authorAvatarProps?.emoji || hexToEmoji(authorId ?? '0')}
              {...(authorImgSrc && { imgSrc: authorImgSrc })}
            />
            {continues && <div className='w-px grow bg-separator' />}
          </div>
          <div className='py-1 min-w-0'>{children}</div>
          {controls && <div className='self-start'>{controls}</div>}
        </div>
      </Avatar.Root>
    );
  },
);

MessageRoot.displayName = 'Message.Root';

//
// Heading
//

export type MessageHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> &
  Pick<MessageMetadata, 'authorName' | 'timestamp'>;

const MessageHeading = ({ children, classNames, timestamp, authorName, ...props }: MessageHeadingProps) => {
  return (
    <div {...props} className={mx('flex gap-2 items-start', classNames)}>
      <p className='grow flex items-baseline gap-2 min-w-0'>
        <MessageAuthorName authorName={authorName} />
        {timestamp && <MessageTime timestamp={timestamp} />}
      </p>
      {children}
    </div>
  );
};

MessageHeading.displayName = 'Message.Heading';

export type MessageAuthorNameProps = Pick<MessageMetadata, 'authorName'>;

const MessageAuthorName = ({ authorName }: MessageAuthorNameProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <Avatar.Label classNames='block truncate min-w-0 shrink text-sm text-subdued'>
      {authorName ?? t('anonymous.label')}
    </Avatar.Label>
  );
};

MessageAuthorName.displayName = 'Message.AuthorName';

export type MessageTimeProps = Pick<MessageMetadata, 'timestamp'>;

const MessageTime = ({ timestamp }: MessageTimeProps) => {
  const { dtLocale } = useTranslation(translationKey);
  const dt = timestamp ? new Date(timestamp) : undefined;
  return (
    <time className='shrink-0 text-subdued text-xs' dateTime={dt?.toISOString()}>
      {dt ? format(dt, 'p', { locale: dtLocale }) : ''}
    </time>
  );
};

MessageTime.displayName = 'Message.Time';

//
// Body
//

export type MessageBodyProps = {
  /** The message whose content blocks are rendered. */
  message: MessageType.Message;
  /** When true, the local user authored this message. */
  isAuthor?: boolean;
  /** When true, the text block is editable. */
  editing?: boolean;
  /** Persist an edited text block. */
  onSave?: (text: string) => void;
};

/**
 * Renders a message's content blocks: text (via editor), proposal, and
 * object/reference tiles (delegated to the injected `Object` component).
 */
const MessageBody = ({ message, isAuthor, editing, onSave }: MessageBodyProps) => {
  const { components } = useThreadContext('Message.Body');
  const textBlockIndex = message.blocks.findIndex((block) => block._tag === 'text');
  const textBlock = textBlockIndex !== -1 ? (message.blocks[textBlockIndex] as ContentBlock.Text) : undefined;
  const proposalBlock = message.blocks.find((block) => block._tag === 'proposal') as ContentBlock.Proposal | undefined;
  const changeBlock = message.blocks.find((block) => block._tag === 'change') as ContentBlock.Change | undefined;
  const references = message.blocks
    .filter((block) => block._tag === 'reference')
    .map((block) => (block as ContentBlock.Reference).reference);
  const Object = components.Object;

  return (
    <>
      {textBlock && <TextBlock block={textBlock} isAuthor={isAuthor} editing={editing} onSave={onSave} />}
      {proposalBlock && <div className='me-4 italic'>{proposalBlock.text}</div>}
      {changeBlock && (
        <p className='me-4 text-sm break-words'>
          {changeBlock.before && <span className='line-through opacity-60'>{changeBlock.before}</span>}
          {changeBlock.before && changeBlock.after && ' '}
          {changeBlock.after && <span>{changeBlock.after}</span>}
        </p>
      )}
      {Object &&
        Ref.Array.targets(references).map((reference, index) => (
          <Object key={index} subject={reference as Obj.Unknown} />
        ))}
    </>
  );
};

MessageBody.displayName = 'Message.Body';

const TextBlock = ({
  block,
  isAuthor,
  editing,
  onSave,
}: {
  block: ContentBlock.Text;
  isAuthor?: boolean;
  editing?: boolean;
  onSave?: (text: string) => void;
}) => {
  const { themeMode } = useThemeContext();
  const inMemoryContentRef = useRef(block.text);

  const handleDocumentChange = useCallback((next: string) => {
    inMemoryContentRef.current = next;
  }, []);

  const saveDocumentChange = useCallback(() => {
    onSave?.(inMemoryContentRef.current);
  }, [onSave]);

  useOnTransition(editing, true, false, saveDocumentChange);

  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      initialValue: block.text,
      extensions: [
        createBasicExtensions({ readOnly: !isAuthor || !editing }),
        createThemeExtensions({ themeMode }),
        command,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleDocumentChange(update.state.doc.toString());
          }
        }),
      ],
    }),
    [block.text, editing, isAuthor, themeMode, handleDocumentChange],
  );

  useEffect(() => {
    if (editing) {
      view?.focus();
    }
  }, [editing, view]);

  return <div ref={parentRef} className='me-4' {...focusAttributes} />;
};

//
// Reactions
//

export type MessageReactionsProps = {
  /** Folded reactions, one entry per emoji. */
  reactions: readonly MessageReaction[];
  /** Emoji offered by the picker. */
  quickReactions?: readonly string[];
  /** Toggles the local identity's reaction. */
  onReact: (emoji: string) => void;
};

/**
 * Folded reaction chips, rendered beneath a message's body. A chip shows the emoji and its count and
 * is active while the local identity is among the reactors; clicking it un-reacts. Counts and active
 * state are computed by the host — see `getReactions`. Adding a reaction lives in the hover controls
 * ({@link MessageReactionPicker}) so an un-reacted message carries no persistent chrome.
 */
const MessageReactions = ({ reactions, onReact }: Omit<MessageReactionsProps, 'quickReactions'>) => {
  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-center gap-1 me-4 mt-1' data-testid='thread.message.reactions'>
      {reactions.map(({ emoji, count, self }) => (
        <button
          key={emoji}
          type='button'
          data-testid='thread.message.reaction'
          data-emoji={emoji}
          aria-pressed={self}
          className={mx(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs dx-focus-ring',
            self ? 'border-accentSurface bg-accentSurface text-accent-text' : 'border-separator text-description',
          )}
          onClick={() => onReact(emoji)}
        >
          <span aria-hidden>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
};

MessageReactions.displayName = 'Message.Reactions';

export type MessageReactionPickerProps = {
  quickReactions?: readonly string[];
  onReact: (emoji: string) => void;
};

/** Add-reaction control for the hover toolbar: a button that reveals a row of quick reactions. */
const MessageReactionPicker = ({ quickReactions = DEFAULT_REACTIONS, onReact }: MessageReactionPickerProps) => {
  const { t } = useTranslation(translationKey);
  const [picking, setPicking] = useState(false);

  const handlePick = useCallback(
    (emoji: string) => {
      setPicking(false);
      onReact(emoji);
    },
    [onReact],
  );

  return (
    <>
      {picking && (
        <div role='group' aria-label={t('add-reaction.label')} className='flex items-center gap-0.5'>
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              type='button'
              data-testid='thread.message.reaction-option'
              data-emoji={emoji}
              className='px-1 py-0.5 rounded-sm text-sm hover:bg-hoverSurface dx-focus-ring'
              onClick={() => handlePick(emoji)}
            >
              <span aria-hidden>{emoji}</span>
              <span className='sr-only'>{emoji}</span>
            </button>
          ))}
        </div>
      )}
      <IconButton
        data-testid='thread.message.react'
        variant='ghost'
        icon='ph--smiley--regular'
        iconOnly
        label={t('add-reaction.label')}
        classNames={[buttonClassNames, hoverableControlItem]}
        onClick={() => setPicking((value) => !value)}
      />
    </>
  );
};

MessageReactionPicker.displayName = 'Message.ReactionPicker';

//
// Quoted parent
//

export type MessageQuoteProps = {
  /** The reply whose `parentMessage` is quoted; renders nothing when it targets nothing. */
  message: MessageType.Message;
};

/**
 * Compact reference to the message a reply targets, rendered above the reply's own body. Subscribes
 * to the ref via `useObject` rather than reading `ref.target`, which is undefined until the target
 * loads and never re-renders when it arrives. Renders nothing until it resolves — a quote is
 * context, and an empty placeholder is worse than none.
 */
const MessageQuote = ({ message }: MessageQuoteProps) => {
  const { getMetadata } = useThreadContext('Message.Quote');
  const [parent] = useObject(message.parentMessage);
  if (!parent) {
    return null;
  }

  const { authorName } = getMetadata(parent);
  const text = parent.blocks
    .flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join(' ')
    .trim();

  return (
    <div
      data-testid='thread.message.quote'
      className='flex items-baseline gap-1.5 me-4 mb-0.5 ps-2 border-is-2 border-separator text-xs text-description min-w-0'
    >
      <span className='shrink-0 font-medium'>{authorName}</span>
      <span className='truncate min-w-0'>{text}</span>
    </div>
  );
};

MessageQuote.displayName = 'Message.Quote';

//
// Thread affordance
//

export type MessageThreadLinkProps = {
  /** Folded thread; absent (or zero replies) renders the "start a thread" wording instead. */
  summary?: MessageThreadSummary;
  onOpen: () => void;
};

/**
 * Thread affordance beneath a root message: "Start a thread" when none exists, otherwise the
 * thread's name, its reply count, and when it was last active.
 */
const MessageThreadLink = ({ summary, onOpen }: MessageThreadLinkProps) => {
  const { t, dtLocale } = useTranslation(translationKey);
  const replyCount = summary?.replyCount ?? 0;
  const lastActivity = summary?.lastActivity ? new Date(summary.lastActivity) : undefined;

  return (
    <button
      type='button'
      data-testid='thread.message.open-thread'
      className={mx(
        'flex items-center gap-1.5 me-4 mt-1 text-xs dx-focus-ring rounded-sm min-w-0',
        replyCount > 0 ? 'text-accent-text' : mx('text-description', hoverableControlItem),
      )}
      onClick={onOpen}
    >
      <Icon icon='ph--chats-circle--regular' size={4} />
      {summary?.name && <span className='truncate min-w-0 font-medium'>{summary.name}</span>}
      <span className='shrink-0'>
        {replyCount > 0 ? t('reply-count.label', { count: replyCount }) : t('start-thread.label')}
      </span>
      {lastActivity && (
        <time className='shrink-0 text-description' dateTime={lastActivity.toISOString()}>
          {formatDistanceToNow(lastActivity, { addSuffix: true, locale: dtLocale })}
        </time>
      )}
    </button>
  );
};

MessageThreadLink.displayName = 'Message.ThreadLink';

//
// Textbox
//

export type MessageTextboxProps = {
  disabled?: boolean;
  onSend?: () => void;
  onClear?: () => void;
  onEditorFocus?: () => void;
} & MessageMetadata &
  UseTextEditorProps;

const keyBindings = ({ onSend, onClear }: Pick<MessageTextboxProps, 'onSend' | 'onClear'>) => [
  {
    key: 'Enter',
    run: () => {
      if (onSend) {
        onSend();
        return true;
      }
      return false;
    },
  },
  {
    key: 'Meta+Backspace',
    run: () => {
      if (onClear) {
        onClear();
        return true;
      }
      return false;
    },
  },
];

export type MessageTextboxHandle = { focus: () => void };

const MessageTextbox = forwardRef<MessageTextboxHandle, MessageTextboxProps>(
  (
    {
      id,
      authorId,
      authorName,
      authorImgSrc,
      authorAvatarProps,
      disabled,
      extensions,
      onSend,
      onClear,
      onEditorFocus,
      ...editorProps
    },
    forwardedRef,
  ) => {
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        extensions: [
          keymap.of(keyBindings({ onSend, onClear })),
          listener({
            onFocus: ({ focusing }) => {
              if (focusing) {
                onEditorFocus?.();
              }
            },
          }),
          extensions,
        ].filter(isTruthy),
        ...editorProps,
      }),
      [id, extensions],
    );

    useImperativeHandle(forwardedRef, () => ({ focus: () => view?.focus() }), [view]);

    return (
      <MessageRoot {...{ id, authorId, authorName, authorImgSrc, authorAvatarProps }} continues={false}>
        <div
          ref={parentRef}
          className={mx('py-0.5 me-1 rounded-xs dx-focus-ring', disabled && 'opacity-50')}
          {...focusAttributes}
        />
      </MessageRoot>
    );
  },
);

MessageTextbox.displayName = 'Message.Textbox';

//
// Tile
//

export type MessageTileProps = {
  message: MessageType.Message;
  classNames?: MessageRootProps['classNames'];
  /** Whether the avatar-rail continuation line is drawn below the tile; false for the last tile. */
  continues?: boolean;
};

/**
 * Full message tile (frame + heading + controls + body). Reads `Thread.Root`
 * context for metadata resolution, injected renderers, and callbacks. This is
 * the unit rendered by `Thread.Messages`.
 */
const MessageTile = ({ message, classNames, continues = true }: MessageTileProps) => {
  const { t } = useTranslation(translationKey);
  const {
    getMetadata,
    getReactions,
    getThreadSummary,
    canDelete,
    quickReactions,
    identityDid,
    editable,
    onMessageDelete,
    onMessageReact,
    onThreadOpen,
    onMessageReply,
    onAcceptProposal,
    onAcceptChange,
    onRejectChange,
    onMessageSelect,
    currentMessageId,
  } = useThreadContext('Message.Tile');
  const [editing, setEditing] = useState(false);

  const metadata = getMetadata(message);
  const isAuthor = !!identityDid && identityDid === metadata.authorId;
  const hasProposal = message.blocks.some((block) => block._tag === 'proposal');
  const hasChange = message.blocks.some((block) => block._tag === 'change');

  const handleEdit = useCallback(() => setEditing((value) => !value), []);
  const handleDelete = useCallback(() => onMessageDelete?.(message.id), [onMessageDelete, message.id]);
  const handleAcceptProposal = useCallback(() => onAcceptProposal?.(message.id), [onAcceptProposal, message.id]);
  const handleAcceptChange = useCallback(() => onAcceptChange?.(message.id), [onAcceptChange, message.id]);
  const handleRejectChange = useCallback(() => onRejectChange?.(message.id), [onRejectChange, message.id]);
  const handleSelect = useCallback(() => onMessageSelect?.(message.id), [onMessageSelect, message.id]);
  const handleReact = useCallback((emoji: string) => onMessageReact?.(message.id, emoji), [onMessageReact, message.id]);
  const handleOpenThread = useCallback(() => onThreadOpen?.(message.id), [onThreadOpen, message.id]);
  const handleReply = useCallback(() => onMessageReply?.(message.id), [onMessageReply, message.id]);
  const handleSave = useCallback(
    (text: string) => {
      Obj.update(message, (message) => {
        const block = message.blocks.find((block) => block._tag === 'text');
        if (block && block._tag === 'text') {
          block.text = text;
        }
      });
    },
    [message],
  );

  const reactions = getReactions?.(message) ?? [];
  const threadSummary = getThreadSummary?.(message);

  const showEdit = isAuthor && editable;
  const showAccept = hasProposal && !!onAcceptProposal;
  const showAcceptChange = hasChange && !!onAcceptChange;
  const showRejectChange = hasChange && !!onRejectChange;
  const showDelete = !!onMessageDelete && (canDelete?.(message) ?? true);
  // Reply and start-thread are mutually exclusive by design: the host offers start-thread in a
  // channel's main view and reply inside a thread, so answering a message pulls the conversation
  // into a thread rather than growing the channel.
  const showReact = !!onMessageReact;
  const showReply = !!onMessageReply;
  const showStartThread = !!onThreadOpen;
  const controls =
    showReact ||
    showReply ||
    showStartThread ||
    showEdit ||
    showAccept ||
    showAcceptChange ||
    showRejectChange ||
    showDelete ? (
      <div className={buttonGroupClassNames}>
        {showReact && <MessageReactionPicker quickReactions={quickReactions} onReact={handleReact} />}
        {showReply && (
          <IconButton
            data-testid='thread.message.reply'
            variant='ghost'
            icon='ph--arrow-bend-up-left--regular'
            iconOnly
            label={t('reply-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleReply}
          />
        )}
        {showStartThread && (
          <IconButton
            data-testid='thread.message.start-thread'
            variant='ghost'
            icon='ph--chats-circle--regular'
            iconOnly
            label={t('start-thread.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleOpenThread}
          />
        )}
        {showEdit && (
          <IconButton
            data-testid={editing ? 'thread.message.save' : 'thread.message.edit'}
            variant='ghost'
            icon={editing ? 'ph--check--regular' : 'ph--pencil-simple--regular'}
            iconOnly
            label={t(editing ? 'save-message.label' : 'edit-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleEdit}
          />
        )}
        {showAccept && (
          <IconButton
            data-testid='thread.message.accept'
            variant='ghost'
            icon='ph--check--regular'
            iconOnly
            label={t('accept-proposal.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleAcceptProposal}
          />
        )}
        {showAcceptChange && (
          <IconButton
            data-testid='thread.message.accept-change'
            variant='ghost'
            icon='ph--check--regular'
            iconOnly
            label={t('accept-change.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleAcceptChange}
          />
        )}
        {showRejectChange && (
          <IconButton
            data-testid='thread.message.reject-change'
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('reject-change.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleRejectChange}
          />
        )}
        {showDelete && (
          <IconButton
            data-testid='thread.message.delete'
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('delete-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleDelete}
          />
        )}
      </div>
    ) : undefined;

  return (
    <MessageRoot
      {...metadata}
      continues={continues}
      controls={controls}
      // Selecting a tile is how the host reveals what it refers to (a suggestion's range in the
      // document), so the whole tile is the target — the accent marks which one is showing.
      onClick={onMessageSelect ? handleSelect : undefined}
      aria-current={currentMessageId === message.id ? 'location' : undefined}
      classNames={[
        hoverableControls,
        hoverableFocusedWithinControls,
        onMessageSelect && 'cursor-pointer',
        currentMessageId === message.id && 'bg-activeSurface',
        classNames,
      ]}
    >
      <MessageHeading authorName={metadata.authorName} timestamp={metadata.timestamp} />
      <MessageQuote message={message} />
      <MessageBody message={message} isAuthor={isAuthor} editing={editing} onSave={handleSave} />
      {showReact && <MessageReactions reactions={reactions} onReact={handleReact} />}
      {/* The summary row appears only once a thread exists; starting one is a hover control. */}
      {showStartThread && threadSummary && <MessageThreadLink summary={threadSummary} onOpen={handleOpenThread} />}
    </MessageRoot>
  );
};

MessageTile.displayName = 'Message.Tile';

//
// Group
//

export type MessageGroupProps = {
  /** Consecutive same-sender messages, in ascending time order, rendered as one tile. */
  messages: readonly MessageType.Message[];
  /** Whether the avatar-rail continuation line is drawn below the tile; false for the last tile. */
  continues?: boolean;
  classNames?: MessageRootProps['classNames'];
};

/**
 * Groups consecutive same-sender messages (see `Thread.Messages`'s grouping
 * window) into a single tile: one heading (author + first message's
 * timestamp) followed by one body per message, stacked in order. Per-message
 * edit/delete controls are not shown per-row in a group — v1 shows them for
 * the group's first message only, since the heading/controls layout is keyed
 * to a single message.
 */
const MessageGroup = ({ messages, continues = true, classNames }: MessageGroupProps) => {
  const { t } = useTranslation(translationKey);
  const {
    getMetadata,
    getReactions,
    getThreadSummary,
    canDelete,
    quickReactions,
    identityDid,
    editable,
    onMessageDelete,
    onMessageReact,
    onThreadOpen,
    onMessageReply,
    onAcceptProposal,
  } = useThreadContext('Message.Group');
  const [editing, setEditing] = useState(false);

  const first = messages[0];
  const metadata = getMetadata(first);
  const isAuthor = !!identityDid && identityDid === metadata.authorId;
  const hasProposal = first.blocks.some((block) => block._tag === 'proposal');

  const handleEdit = useCallback(() => setEditing((value) => !value), []);
  const handleDelete = useCallback(() => onMessageDelete?.(first.id), [onMessageDelete, first.id]);
  const handleAcceptProposal = useCallback(() => onAcceptProposal?.(first.id), [onAcceptProposal, first.id]);
  const handleSave = useCallback(
    (text: string) => {
      Obj.update(first, (first) => {
        const block = first.blocks.find((block) => block._tag === 'text');
        if (block && block._tag === 'text') {
          block.text = text;
        }
      });
    },
    [first],
  );

  const showEdit = isAuthor && editable;
  const showAccept = hasProposal && !!onAcceptProposal;
  const showDelete = !!onMessageDelete && (canDelete?.(first) ?? true);
  const showReact = !!onMessageReact;
  const showReply = !!onMessageReply;
  const showStartThread = !!onThreadOpen;
  const controls =
    showReact || showReply || showStartThread || showEdit || showAccept || showDelete ? (
      <div className={buttonGroupClassNames}>
        {showReact && (
          <MessageReactionPicker
            quickReactions={quickReactions}
            onReact={(emoji) => onMessageReact?.(first.id, emoji)}
          />
        )}
        {showReply && (
          <IconButton
            data-testid='thread.message.reply'
            variant='ghost'
            icon='ph--arrow-bend-up-left--regular'
            iconOnly
            label={t('reply-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={() => onMessageReply?.(first.id)}
          />
        )}
        {showStartThread && (
          <IconButton
            data-testid='thread.message.start-thread'
            variant='ghost'
            icon='ph--chats-circle--regular'
            iconOnly
            label={t('start-thread.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={() => onThreadOpen?.(first.id)}
          />
        )}
        {showEdit && (
          <IconButton
            data-testid={editing ? 'thread.message.save' : 'thread.message.edit'}
            variant='ghost'
            icon={editing ? 'ph--check--regular' : 'ph--pencil-simple--regular'}
            iconOnly
            label={t(editing ? 'save-message.label' : 'edit-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleEdit}
          />
        )}
        {showAccept && (
          <IconButton
            data-testid='thread.message.accept'
            variant='ghost'
            icon='ph--check--regular'
            iconOnly
            label={t('accept-proposal.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleAcceptProposal}
          />
        )}
        {showDelete && (
          <IconButton
            data-testid='thread.message.delete'
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('delete-message.label')}
            classNames={[buttonClassNames, hoverableControlItem]}
            onClick={handleDelete}
          />
        )}
      </div>
    ) : undefined;

  return (
    <MessageRoot
      {...metadata}
      continues={continues}
      controls={controls}
      classNames={[hoverableControls, hoverableFocusedWithinControls, classNames]}
    >
      <MessageHeading authorName={metadata.authorName} timestamp={metadata.timestamp} />
      {messages.map((message) => (
        <Fragment key={message.id}>
          <MessageQuote message={message} />
          <MessageBody
            message={message}
            isAuthor={isAuthor}
            editing={editing && message === first}
            onSave={handleSave}
          />
          {/* Reactions and threads are per-message, unlike the group's edit/delete controls. */}
          {onMessageReact && (
            <MessageReactions
              reactions={getReactions?.(message) ?? []}
              onReact={(emoji) => onMessageReact(message.id, emoji)}
            />
          )}
          {onThreadOpen && getThreadSummary?.(message) && (
            <MessageThreadLink summary={getThreadSummary(message)} onOpen={() => onThreadOpen(message.id)} />
          )}
        </Fragment>
      ))}
    </MessageRoot>
  );
};

MessageGroup.displayName = 'Message.Group';

//
// Message
//

export const Message = {
  Root: MessageRoot,
  Heading: MessageHeading,
  AuthorName: MessageAuthorName,
  Time: MessageTime,
  Body: MessageBody,
  Reactions: MessageReactions,
  ReactionPicker: MessageReactionPicker,
  Quote: MessageQuote,
  ThreadLink: MessageThreadLink,
  Textbox: MessageTextbox,
  Tile: MessageTile,
  Group: MessageGroup,
};
