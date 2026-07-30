//
// Copyright 2023 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import { format } from 'date-fns/format';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject, useObjectValue } from '@dxos/echo-react';
import {
  Avatar,
  Icon,
  Popover,
  Tag,
  type ThemedClassName,
  useOnTransition,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { type UseTextEditorProps, useTextEditor } from '@dxos/react-ui-editor';
import { type ActionGroupBuilder, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { EmojiPickerContent } from '@dxos/react-ui-pickers';
import { type ContentBlock, type Message as MessageType } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, keymap, listener } from '@dxos/ui-editor';
import {
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedWithinControls,
  hoverableOverlayControlItem,
  mx,
} from '@dxos/ui-theme';
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
  ComponentPropsWithRef<'div'> &
    MessageMetadata &
    Partial<{
      continues: boolean;
      controls: ReactNode;
      /** Whether to draw the avatar; false for a row continuing the sender above it. */
      showAvatar: boolean;
    }>
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
      showAvatar = true,
      children,
      classNames,
      ...rootProps
    },
    forwardedRef,
  ) => {
    // Must wrap the message since Avatar.Label may be used in the content.
    // Two columns (avatar/rail · content): the controls float over the content rather than taking a
    // column of their own, which would narrow every message by the width of a toolbar that is only
    // visible on hover.
    return (
      <Avatar.Root>
        <div
          data-testid='thread.message'
          {...rootProps}
          className={mx('relative grid grid-cols-[var(--dx-rail-size)_1fr] w-full', classNames)}
          ref={forwardedRef}
        >
          {/* Only a row that draws an avatar needs the padding that aligns it with the first line of
              text; a continuation row lets the rail run its full height. */}
          <div className={mx('flex flex-col items-center', showAvatar && 'pt-1')}>
            {showAvatar && (
              <Avatar.Content
                size={avatarSize}
                hue={authorAvatarProps?.hue || hexToHue(authorId ?? '0')}
                fallback={authorAvatarProps?.emoji || hexToEmoji(authorId ?? '0')}
                {...(authorImgSrc && { imgSrc: authorImgSrc })}
              />
            )}
            {/* The connector has to reach the next row's avatar to read as one rail: it starts flush
                under this avatar (no gap) and `-mb-1` carries it across that row's `pt-1`. */}
            {continues && <div className='w-px grow -mb-1 bg-separator' />}
          </div>
          <div className='py-1 min-w-0'>{children}</div>
          {/* Anchored to the row's top-end corner, over the first line — the same place Discord puts
              it, and the corner of a message least likely to hold text worth reading. */}
          {controls && <div className='absolute z-1 top-0 end-1'>{controls}</div>}
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
  /** Ends edit mode, committing whatever the editor holds. */
  onCommitEdit?: () => void;
  /** Ends edit mode without committing. */
  onCancelEdit?: () => void;
};

/**
 * Renders a message's content blocks: text (via editor), proposal, and
 * object/reference tiles (delegated to the injected `Object` component).
 */
const MessageBody = ({ message, isAuthor, editing, onSave, onCommitEdit, onCancelEdit }: MessageBodyProps) => {
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
      {textBlock && (
        <TextBlock
          block={textBlock}
          isAuthor={isAuthor}
          editing={editing}
          onSave={onSave}
          onCommitEdit={onCommitEdit}
          onCancelEdit={onCancelEdit}
        />
      )}
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
  onCommitEdit,
  onCancelEdit,
}: {
  block: ContentBlock.Text;
  isAuthor?: boolean;
  editing?: boolean;
  onSave?: (text: string) => void;
  /** Ends edit mode, committing whatever the editor holds. */
  onCommitEdit?: () => void;
  /** Ends edit mode without committing. */
  onCancelEdit?: () => void;
}) => {
  const { t } = useTranslation(translationKey);
  const { themeMode } = useThemeContext();
  const inMemoryContentRef = useRef(block.text);

  const handleDocumentChange = useCallback((next: string) => {
    inMemoryContentRef.current = next;
  }, []);

  // Leaving edit mode is the single commit path, whichever affordance ended it — and an unchanged
  // body is not written back, so cancelling (which restores the original text first) costs no
  // re-append of the message to its feed.
  const saveDocumentChange = useCallback(() => {
    if (inMemoryContentRef.current !== block.text) {
      onSave?.(inMemoryContentRef.current);
    }
  }, [onSave, block.text]);

  useOnTransition(editing, true, false, saveDocumentChange);

  // The keymap is captured when the editor is built, so it reads the current callbacks through refs
  // rather than closing over them (see `Thread.Textbox` for the same hazard on send).
  const onCommitEditRef = useRef(onCommitEdit);
  onCommitEditRef.current = onCommitEdit;
  const onCancelEditRef = useRef(onCancelEdit);
  onCancelEditRef.current = onCancelEdit;

  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      initialValue: block.text,
      extensions: [
        // Enter commits and Shift+Enter (falling through to the default binding) breaks the line, the
        // same contract as composing a message — an edit is submitted, not toggled off.
        editing &&
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                onCommitEditRef.current?.();
                return true;
              },
            },
            {
              key: 'Escape',
              run: () => {
                inMemoryContentRef.current = block.text;
                onCancelEditRef.current?.();
                return true;
              },
            },
          ]),
        createBasicExtensions({ readOnly: !isAuthor || !editing }),
        createThemeExtensions({ themeMode }),
        command,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleDocumentChange(update.state.doc.toString());
          }
        }),
      ].filter(isTruthy),
    }),
    [block.text, editing, isAuthor, themeMode, handleDocumentChange],
  );

  useEffect(() => {
    if (editing) {
      view?.focus();
    }
  }, [editing, view]);

  // While editing, the body reads as an input rather than as text with a different button beside it:
  // it takes an accented frame and states how to commit, so the mode is legible without hovering.
  return (
    <div className={mx('me-4', editing && 'rounded-sm ring-1 ring-accent-bg bg-attention-surface px-1.5 py-0.5')}>
      <div ref={parentRef} {...focusAttributes} />
      {editing && (
        <p data-testid='thread.message.edit-hint' className='pt-0.5 text-xs text-description'>
          {t('editing.message')}
        </p>
      )}
    </div>
  );
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
  /** The message's UI state, which the add-reaction pill opens the picker through. */
  state: Atom.Writable<MessageState>;
};

/**
 * Folded reaction pills, rendered beneath a message's body. A pill shows the emoji and its count and
 * is accented while the local identity is among the reactors; clicking it un-reacts. Counts and active
 * state are computed by the host — see `getReactions`.
 *
 * A message that carries reactions ends the row with an add-reaction pill: reacting alongside others
 * is the common move once a row exists, and it should not cost a trip back to the hover toolbar. A
 * message with none carries no pills at all, so adding the first one stays a hover control.
 */
const MessageReactions = ({ reactions, onReact, state }: Omit<MessageReactionsProps, 'quickReactions'>) => {
  const { t } = useTranslation(translationKey);
  const { picking } = useAtomValue(state);
  const setState = useAtomSet(state);

  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-center gap-1 me-4 mt-1' data-testid='thread.message.reactions'>
      {reactions.map(({ emoji, count, self }) => (
        // `Tag` carries the pill shape and sizing from the theme; the button is the interactive host so
        // the pill keeps a focus ring and pressed state. The hue stays neutral and the accent ring
        // alone marks "you reacted" — the palette hues are categorical, not stateful.
        <Tag key={emoji} asChild>
          <button
            type='button'
            data-testid='thread.message.reaction'
            data-emoji={emoji}
            aria-pressed={self}
            className={mx('flex items-center gap-1 dx-focus-ring', self && 'ring-1 ring-accent-bg')}
            onClick={() => onReact(emoji)}
          >
            <span aria-hidden>{emoji}</span>
            <span>{count}</span>
          </button>
        </Tag>
      ))}
      <ReactionPicker
        open={picking === 'reactions'}
        onOpenChange={(open) => setState((current) => ({ ...current, picking: open ? 'reactions' : undefined }))}
        onSelect={onReact}
      >
        {/* A trigger rather than an anchor: opened from here the picker belongs to this pill. */}
        <Popover.Trigger asChild>
          <Tag asChild>
            <button type='button' data-testid='thread.message.add-reaction' className='dx-focus-ring'>
              <Icon icon='ph--smiley--regular' size={4} classNames='text-subdued' />
              <span className='sr-only'>{t('add-reaction.label')}</span>
            </button>
          </Tag>
        </Popover.Trigger>
      </ReactionPicker>
    </div>
  );
};

MessageReactions.displayName = 'Message.Reactions';

/**
 * The full emoji picker in a popover, positioned against whatever the caller passes as its anchor or
 * trigger — the hover toolbar or a message's reaction row. Escape closes it here rather than falling
 * through to the thread, which would move attention out of the message.
 */
const ReactionPicker = ({
  open,
  onOpenChange,
  onSelect,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
  children: ReactNode;
}) => (
  <Popover.Root open={open} onOpenChange={onOpenChange}>
    {children}
    <Popover.Portal>
      <Popover.Content
        side='bottom'
        align='end'
        data-testid='thread.message.reaction-picker'
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onOpenChange(false);
          }
        }}
      >
        <EmojiPickerContent
          onSelect={(emoji) => {
            onOpenChange(false);
            onSelect(emoji);
          }}
        />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);

//
// Controls
//

/**
 * One message tile's own UI state.
 *
 * Held in an atom rather than React state because the controls' action graph *reads* it — the menu
 * builder takes it through `get`, so entering edit mode recomputes the graph instead of the tile
 * rebuilding it through a dependency list, which would tear the whole menu down and mount it again.
 */
export type MessageState = {
  /** Whether the body is in edit mode. */
  editing: boolean;
  /** Which affordance the full emoji picker is open from, if any — each anchors it to itself. */
  picking?: 'toolbar' | 'reactions';
};

const makeMessageState = () => Atom.make<MessageState>({ editing: false });

export type MessageControlsProps = {
  /** Message the controls act on. */
  message: MessageType.Message;
  /** That message's UI state, which the controls both read and drive. */
  state: Atom.Writable<MessageState>;
};

/** Quick reactions rendered inline in the toolbar; the rest of the set lives behind the picker. */
const INLINE_REACTIONS = 3;

/**
 * Hover toolbar for a message, built from a menu action graph (`MenuBuilder` + `Menu.Toolbar`) rather
 * than hand-placed buttons, so item rendering, dropdowns, sizing and keyboard behaviour come from the
 * menu system. A few reactions sit inline with a button opening the full emoji picker beside them;
 * reply or start-a-thread and accept/reject follow; edit and delete are buried in the overflow (⋯)
 * menu, since they are destructive or rare. While editing, the toolbar collapses to save/cancel — the
 * only two moves that apply.
 */
const MessageControls = ({ message, state }: MessageControlsProps) => {
  const {
    getReactions,
    getThreadSummary,
    canDelete,
    quickReactions = DEFAULT_REACTIONS,
    getMetadata,
    identityDid,
    editable,
    onMessageDelete,
    onMessageReact,
    onThreadOpen,
    onThreadCreate,
    onMessageReply,
    onAcceptProposal,
    onAcceptChange,
    onRejectChange,
  } = useThreadContext('Message.Controls');

  const { editing, picking } = useAtomValue(state);
  const setState = useAtomSet(state);
  const setEditing = useCallback((editing: boolean) => setState((current) => ({ ...current, editing })), [setState]);
  const setPicking = useCallback(
    (open: boolean) => setState((current) => ({ ...current, picking: open ? 'toolbar' : undefined })),
    [setState],
  );

  const metadata = getMetadata(message);
  const isAuthor = !!identityDid && identityDid === metadata.authorId;
  const hasProposal = message.blocks.some((block) => block._tag === 'proposal');
  const hasChange = message.blocks.some((block) => block._tag === 'change');
  const threadSummary = getThreadSummary?.(message);
  const inlineReactions = quickReactions.slice(0, INLINE_REACTIONS);

  const showEdit = isAuthor && !!editable;
  const showDelete = !!onMessageDelete && (canDelete?.(message) ?? true);
  // Reply and start-thread are mutually exclusive by design: the host offers start-thread in a
  // channel's main view and reply inside a thread, so answering a message pulls the conversation into
  // a thread rather than growing the channel. Starting one is offered only where none exists yet.
  const showStartThread = !!onThreadCreate && !threadSummary;

  const hasControls =
    editing ||
    !!onMessageReact ||
    !!onMessageReply ||
    showStartThread ||
    (!!threadSummary && !!onThreadOpen) ||
    (hasProposal && !!onAcceptProposal) ||
    (hasChange && (!!onAcceptChange || !!onRejectChange)) ||
    showEdit ||
    showDelete;

  const menuActions = useMenuBuilder(
    (get) => {
      const builder = MenuBuilder.make().root({ label: ['message-controls.title', { ns: translationKey }] });

      // Read through `get`, not from the closure: edit mode swaps the whole item set, and reading it
      // reactively is what keeps that swap inside the graph rather than remounting the menu.
      if (get(state).editing) {
        builder.action(
          'save',
          {
            label: ['save-message.label', { ns: translationKey }],
            icon: 'ph--check--regular',
            iconOnly: true,
            testId: 'thread.message.save',
          },
          () => setEditing(false),
        );
        builder.action(
          'cancel',
          {
            label: ['cancel-edit.label', { ns: translationKey }],
            icon: 'ph--x--regular',
            iconOnly: true,
            testId: 'thread.message.cancel-edit',
          },
          () => setEditing(false),
        );
        return builder.build();
      }

      if (onMessageReact) {
        // The quick reactions form their own group — one tap each, separated from the actions that do
        // something to the message rather than respond to it.
        for (const emoji of inlineReactions) {
          builder.action(`react-${emoji}`, { label: emoji, testId: 'thread.message.reaction-option' }, () =>
            onMessageReact(message.id, emoji),
          );
        }
        builder.separator('line');
        builder.action(
          'more-reactions',
          {
            label: ['add-reaction.label', { ns: translationKey }],
            icon: 'ph--smiley--regular',
            iconOnly: true,
            testId: 'thread.message.react',
          },
          () => setPicking(true),
        );
      }

      if (onMessageReply) {
        builder.action(
          'reply',
          {
            label: ['reply-message.label', { ns: translationKey }],
            icon: 'ph--arrow-bend-up-left--regular',
            iconOnly: true,
            testId: 'thread.message.reply',
          },
          () => onMessageReply(message.id),
        );
      }

      // One slot for the message's thread, whichever state it is in: the affordance becomes "view" once
      // a thread exists rather than disappearing, so the control does not move under the cursor.
      if (threadSummary && onThreadOpen) {
        builder.action(
          'view-thread',
          {
            label: ['view-thread.label', { ns: translationKey }],
            icon: 'ph--chats-circle--regular',
            iconOnly: true,
            testId: 'thread.message.view-thread',
          },
          () => onThreadOpen(message.id),
        );
      } else if (showStartThread && onThreadCreate) {
        builder.action(
          'start-thread',
          {
            label: ['start-thread.label', { ns: translationKey }],
            icon: 'ph--chats-circle--regular',
            iconOnly: true,
            testId: 'thread.message.start-thread',
          },
          () => onThreadCreate(message.id),
        );
      }

      if (hasProposal && onAcceptProposal) {
        builder.action(
          'accept-proposal',
          {
            label: ['accept-proposal.label', { ns: translationKey }],
            icon: 'ph--check--regular',
            iconOnly: true,
            testId: 'thread.message.accept',
          },
          () => onAcceptProposal(message.id),
        );
      }

      if (hasChange && onAcceptChange) {
        builder.action(
          'accept-change',
          {
            label: ['accept-change.label', { ns: translationKey }],
            icon: 'ph--check--regular',
            iconOnly: true,
            testId: 'thread.message.accept-change',
          },
          () => onAcceptChange(message.id),
        );
      }

      if (hasChange && onRejectChange) {
        builder.action(
          'reject-change',
          {
            label: ['reject-change.label', { ns: translationKey }],
            icon: 'ph--x--regular',
            iconOnly: true,
            testId: 'thread.message.reject-change',
          },
          () => onRejectChange(message.id),
        );
      }

      if (showEdit || showDelete) {
        builder.menu(
          'more',
          (group: ActionGroupBuilder) => {
            if (showEdit) {
              group.action(
                'edit',
                {
                  label: ['edit-message.label', { ns: translationKey }],
                  icon: 'ph--pencil-simple--regular',
                  testId: 'thread.message.edit',
                },
                () => setEditing(true),
              );
            }
            if (showDelete && onMessageDelete) {
              group.action(
                'delete',
                {
                  label: ['delete-message.label', { ns: translationKey }],
                  icon: 'ph--trash--regular',
                  testId: 'thread.message.delete',
                },
                () => onMessageDelete(message.id),
              );
            }
          },
          'thread.message.more',
        );
      }

      return builder.build();
    },
    [
      message,
      state,
      inlineReactions,
      showEdit,
      showDelete,
      showStartThread,
      hasProposal,
      hasChange,
      threadSummary,
      onMessageReact,
      onMessageReply,
      onThreadOpen,
      onThreadCreate,
      onMessageDelete,
      onAcceptProposal,
      onAcceptChange,
      onRejectChange,
      setEditing,
      setPicking,
    ],
  );

  if (!hasControls) {
    return null;
  }

  return (
    // `alwaysActive`: a message toolbar belongs to the hovered row, not to whichever plank holds
    // attention, so it must not disable itself when the thread is unattended.
    <Menu.Root {...menuActions} alwaysActive iconSize={4}>
      <ReactionPicker
        open={picking === 'toolbar'}
        onOpenChange={setPicking}
        onSelect={(emoji) => onMessageReact?.(message.id, emoji)}
      >
        {/* The picker opens from a toolbar action rather than its own trigger — that keeps every
            affordance in the action graph, and so in one running order — so the toolbar is the anchor. */}
        <Popover.Anchor asChild>
          {/* It floats over the message, so it keeps the toolbar's own surface and shadow (it has to
              hide what is behind it) and `w-auto` — the toolbar is full-width by default, which an
              absolutely positioned box would resolve against the whole row. */}
          <Menu.Toolbar
            classNames={mx(
              'w-auto rounded-sm border border-separator',
              // Editing collapses the toolbar to save/cancel, which must stay put rather than follow
              // the pointer; so must a toolbar whose menu or picker is open, since reaching either
              // takes the pointer off the row.
              !editing && !picking && hoverableOverlayControlItem,
              'has-[[aria-expanded=true]]:[--controls-opacity:1] has-[[aria-expanded=true]]:[--controls-visibility:visible]',
            )}
            density='sm'
          />
        </Popover.Anchor>
      </ReactionPicker>
    </Menu.Root>
  );
};

MessageControls.displayName = 'Message.Controls';

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
      className='flex items-center gap-1.5 me-4 mb-0.5 text-xs text-description min-w-0'
    >
      {/* The arrow says "this answers that" on its own, which a bare quotation rule does not. */}
      <Icon icon='ph--arrow-bend-up-left--regular' size={3} classNames='shrink-0 text-subdued' />
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
  /**
   * Whether this row continues the sender of the row above it, as in a group: the avatar and heading
   * are theirs, so this row draws neither and shows only its own body and controls.
   */
  continuation?: boolean;
};

/**
 * Full message tile (frame + heading + controls + body). Reads `Thread.Root`
 * context for metadata resolution, injected renderers, and callbacks. This is
 * the unit rendered by `Thread.Messages`.
 */
const MessageTile = ({ message, classNames, continues = true, continuation = false }: MessageTileProps) => {
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
    onThreadCreate,
    onMessageReply,
    onAcceptProposal,
    onAcceptChange,
    onRejectChange,
    onMessageSelect,
    currentMessageId,
  } = useThreadContext('Message.Tile');
  // Subscribed for the re-render, not the value: a query reports its result set, not a mutation
  // within one — so an edit, or the mark that creates a message's thread, would otherwise leave this
  // row showing what it rendered before.
  useObjectValue(message);

  // One state atom per tile, shared with its controls: the toolbar drives edit mode and the body
  // renders it, and neither rebuilds the other's menu to say so.
  const state = useMemo(makeMessageState, []);
  const { editing } = useAtomValue(state);
  const setState = useAtomSet(state);

  const metadata = getMetadata(message);
  const isAuthor = !!identityDid && identityDid === metadata.authorId;

  const handleExitEdit = useCallback(() => setState((current) => ({ ...current, editing: false })), [setState]);
  const handleSelect = useCallback(() => onMessageSelect?.(message.id), [onMessageSelect, message.id]);
  const handleReact = useCallback((emoji: string) => onMessageReact?.(message.id, emoji), [onMessageReact, message.id]);
  const handleOpenThread = useCallback(() => onThreadOpen?.(message.id), [onThreadOpen, message.id]);
  const handleSave = useCallback(
    (text: string) => {
      Obj.update(message, (message) => {
        const block = message.blocks.find((block) => block._tag === 'text');
        if (block && block._tag === 'text') {
          block.text = text;
        }
      });
      handleExitEdit();
    },
    [message, handleExitEdit],
  );
  const reactions = getReactions?.(message) ?? [];
  const threadSummary = getThreadSummary?.(message);

  const controls = <MessageControls message={message} state={state} />;

  return (
    <MessageRoot
      {...metadata}
      continues={continues}
      controls={controls}
      // Selecting a tile is how the host reveals what it refers to (a suggestion's range in the
      // document), so the whole tile is the target — the accent marks which one is showing.
      showAvatar={!continuation}
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
      {!continuation && <MessageHeading authorName={metadata.authorName} timestamp={metadata.timestamp} />}
      <MessageQuote message={message} />
      <MessageBody
        message={message}
        isAuthor={isAuthor}
        editing={editing}
        onSave={handleSave}
        onCommitEdit={handleExitEdit}
        onCancelEdit={handleExitEdit}
      />
      {onMessageReact && <MessageReactions reactions={reactions} onReact={handleReact} state={state} />}
      {/* The summary row appears only once a thread exists; starting one is a hover control. */}
      {threadSummary && onThreadOpen && <MessageThreadLink summary={threadSummary} onOpen={handleOpenThread} />}
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
 * Groups consecutive same-sender messages (see `Thread.Messages`'s grouping window): the first row
 * carries the sender's avatar and heading and the rest continue it, so the run reads as one block.
 *
 * Each message is its own row with its own controls — reacting to, replying to, editing or deleting
 * the third message in a run has to act on *that* message, and one control set per group could only
 * ever act on its first.
 */
const MessageGroup = ({ messages, continues = true, classNames }: MessageGroupProps) => (
  <>
    {messages.map((message, index) => (
      <MessageTile
        key={message.id}
        message={message}
        continuation={index > 0}
        // The rail runs on through the group; only the last row of the last group ends it.
        continues={continues || index < messages.length - 1}
        classNames={classNames}
      />
    ))}
  </>
);

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
  Controls: MessageControls,
  Quote: MessageQuote,
  ThreadLink: MessageThreadLink,
  Textbox: MessageTextbox,
  Tile: MessageTile,
  Group: MessageGroup,
};
