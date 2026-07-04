//
// Copyright 2023 DXOS.org
//

import { format } from 'date-fns/format';
import { type Locale } from 'date-fns/locale';
import { startOfDay } from 'date-fns/startOfDay';
import React, {
  type ComponentPropsWithRef,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Obj } from '@dxos/echo';
import {
  type ComposableProps,
  Icon,
  IconButton,
  ScrollArea,
  type ThemedClassName,
  composable,
  composableProps,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { Mosaic, type MosaicEventHandler, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { type Message as MessageType } from '@dxos/types';
import { type Extension, createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { command } from '../command';
import { ThreadContextProvider, useThreadContext } from '../context';
import { Message } from '../Message';
import { translationKey } from '../translations';
import { type MessageMetadata, type ThreadContextValue } from '../types';

const getMessageId = (message: MessageType.Message) => Obj.getURI(message);

//
// Root
//

export type ThreadRootProps = PropsWithChildren<
  Omit<ThreadContextValue, 'components'> & Partial<Pick<ThreadContextValue, 'components'>>
>;

/**
 * Headless root of a thread. Provides message-tile context (metadata resolver,
 * injected renderers, callbacks) and the Mosaic root that `Thread.Messages`
 * renders its virtual stack within. Renders no DOM of its own — wrap the visible
 * thread chrome in `Thread.Content`.
 */
const ThreadRoot = ({
  children,
  getMetadata,
  components,
  identityDid,
  editable,
  onMessageDelete,
  onAcceptProposal,
}: ThreadRootProps) => {
  // Composer focus handler registered by Thread.Textbox; invoked by Thread.Header's caret.
  const composerFocus = useRef<(() => void) | undefined>(undefined);

  const registerComposerFocus = useCallback((focus: (() => void) | undefined) => {
    composerFocus.current = focus;
  }, []);

  const focusComposer = useCallback(() => composerFocus.current?.(), []);

  return (
    <ThreadContextProvider
      getMetadata={getMetadata}
      components={components ?? {}}
      identityDid={identityDid}
      editable={editable}
      registerComposerFocus={registerComposerFocus}
      focusComposer={focusComposer}
      onMessageDelete={onMessageDelete}
      onAcceptProposal={onAcceptProposal}
    >
      <Mosaic.Root>{children}</Mosaic.Root>
    </ThreadContextProvider>
  );
};

ThreadRoot.displayName = 'Thread.Root';

//
// Content
//

type ThreadContentExtra = {
  id?: string;
  current?: boolean | string;
} & Pick<ComponentPropsWithRef<'div'>, 'onClickCapture' | 'onFocusCapture'>;

export type ThreadContentProps = ComposableProps<ThreadContentExtra>;

/** Visible thread container (the attention surface that hosts header / messages / composer). */
const ThreadContent = composable<HTMLDivElement, ThreadContentExtra>(
  ({ children, current, id, ...props }, forwardedRef) => {
    return (
      <div
        {...composableProps(props, {
          role: 'group',
          classNames: [
            'flex flex-col bg-[var(--surface-bg)] current-related dx-attention-surface [--controls-opacity:0]',
            hoverableFocusedWithinControls,
          ],
        })}
        data-testid='thread'
        id={id}
        aria-current={current ? 'location' : undefined}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

ThreadContent.displayName = 'Thread.Content';

//
// Header
//

export type ThreadHeaderProps = Omit<
  ComposableProps<{
    /** Snippet text rendered inside a `<p>` (a string, not a DOM element). */
    title?: string;
    detached?: boolean;
    /** Whether this is the current/selected thread; accents the title. */
    current?: boolean;
    /** Trailing controls rendered in the right column (aligns with message-tile controls). */
    controls?: ReactNode;
    /** Invoked when the caret affordance is activated to select/focus this thread. */
    onSelect?: () => void;
  }>,
  'children'
>;

/**
 * Thread header row: caret (rail) · snippet (content) · controls. Owns its own
 * `[rail · 1fr · controls]` grid so the trailing controls align with message-tile
 * controls (which use the same template) — no grid is leaked in from the caller.
 */
const ThreadHeader = composable<HTMLDivElement, ThreadHeaderProps>(
  ({ title, detached, current, controls, onSelect, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { focusComposer } = useThreadContext('Thread.Header');
    const handleSelect = useCallback(() => {
      onSelect?.();
      focusComposer();
    }, [onSelect, focusComposer]);

    return (
      <div
        {...composableProps(props, {
          classNames: [
            'grid grid-cols-[var(--dx-rail-size)_1fr_min-content] items-center',
            hoverableControls,
            hoverableFocusedWithinControls,
          ],
        })}
        ref={forwardedRef}
      >
        <div className='flex items-center justify-center'>
          <IconButton
            iconOnly
            variant='ghost'
            density='sm'
            icon='ph--caret-double-right--regular'
            label={t('select-thread.label')}
            classNames='text-description'
            onClick={handleSelect}
          />
        </div>
        <div className='flex items-center overflow-hidden'>
          <p
            role='heading'
            data-testid='thread.heading'
            className={mx(
              'me-2 font-medium truncate italic',
              current ? 'text-accent-text' : 'text-description',
              detached && 'line-through decoration-1',
            )}
          >
            {title}
          </p>
        </div>
        {controls}
      </div>
    );
  },
);

ThreadHeader.displayName = 'Thread.Header';

//
// Messages
//

/** A run of consecutive same-sender messages (within the grouping window) rendered as one tile. */
type MessageGroupItem = { kind: 'group'; id: string; messages: MessageType.Message[]; last?: boolean };

/**
 * A divider row between groups: day-labeled (calendar-day boundary) or plain
 * (a same-day gap exceeding `gapDividerMs`). Day boundaries take priority
 * when both coincide on the same message — see `groupMessages`.
 */
type DividerItem = { kind: 'divider'; id: string; label?: string };

type ThreadItem = MessageGroupItem | DividerItem;

const getThreadItemId = (item: ThreadItem) => item.id;

/** Stable per-sender key: prefers the DID, then the (deprecated) identity key, then name/email, else 'anon'. */
const senderKey = (message: MessageType.Message): string =>
  message.sender.identityDid ?? message.sender.identityKey ?? message.sender.name ?? message.sender.email ?? 'anon';

/** Message send time in epoch ms; malformed/missing `created` sorts as if sent at the epoch. */
const messageTime = (message: MessageType.Message): number => {
  const time = Date.parse(message.created);
  return Number.isFinite(time) ? time : 0;
};

/**
 * Preprocesses ascending, time-ordered `messages` into a flat list of divider
 * and group items for `Thread.Messages`'s virtual stack:
 * - A day divider (labeled with the calendar date) precedes the first message
 *   of each calendar day.
 * - A plain divider (no label) marks a same-day gap exceeding `gapDividerMs`.
 * - When both would fall on the same message, only the day divider is emitted.
 * - Consecutive messages from the same sender within `groupWindowMs` of the
 *   previous message in the group are merged into one `MessageGroupItem`; a
 *   divider always starts a new group.
 */
const groupMessages = (
  messages: readonly MessageType.Message[],
  {
    groupWindowMs,
    dayDivider,
    gapDividerMs,
    dtLocale,
  }: { groupWindowMs: number; dayDivider: boolean; gapDividerMs: number; dtLocale?: Locale },
): ThreadItem[] => {
  const items: ThreadItem[] = [];
  let currentGroup: MessageGroupItem | undefined;
  // Tracks the last message appended to `currentGroup`, since `Array.prototype.at(-1)`
  // on `currentGroup.messages` would need a non-null assertion despite `currentGroup`
  // always being non-empty by construction.
  let lastGroupMessage: MessageType.Message | undefined;
  let prevTime: number | undefined;
  let prevDay: number | undefined;

  for (const message of messages) {
    const time = messageTime(message);
    const day = startOfDay(time).getTime();

    const dayBoundary = dayDivider && (prevDay === undefined || day !== prevDay);
    const gapBoundary = !dayBoundary && prevTime !== undefined && time - prevTime > gapDividerMs;

    if (dayBoundary) {
      items.push({
        kind: 'divider',
        id: `divider:day:${day}`,
        label: format(day, 'EEEE, MMMM d', { locale: dtLocale }),
      });
      currentGroup = undefined;
    } else if (gapBoundary) {
      items.push({ kind: 'divider', id: `divider:gap:${time}` });
      currentGroup = undefined;
    }

    const sameSenderAsGroup = currentGroup && lastGroupMessage && senderKey(lastGroupMessage) === senderKey(message);
    const withinGroupWindow = currentGroup && lastGroupMessage && time - messageTime(lastGroupMessage) <= groupWindowMs;

    if (currentGroup && sameSenderAsGroup && withinGroupWindow) {
      currentGroup.messages.push(message);
    } else {
      currentGroup = { kind: 'group', id: getMessageId(message), messages: [message] };
      items.push(currentGroup);
    }
    lastGroupMessage = message;

    prevTime = time;
    prevDay = day;
  }

  // The trailing group is the last message tile; suppress its avatar-rail continuation line.
  if (currentGroup) {
    currentGroup.last = true;
  }

  return items;
};

//
// Divider
//

const ThreadDivider = ({ label }: { label?: string }) =>
  label ? (
    <div className='flex items-center gap-2 px-2 py-2 text-xs text-description'>
      <div className='h-px grow bg-separator' />
      <span className='shrink-0'>{label}</span>
      <div className='h-px grow bg-separator' />
    </div>
  ) : (
    <div className='px-2 py-2'>
      <div className='h-px bg-separator' />
    </div>
  );

ThreadDivider.displayName = 'Thread.Divider';

const ThreadItemAdapter = ({ id, data, location, draggable, current, selected }: MosaicTileProps<ThreadItem>) => (
  <Mosaic.Tile id={id} data={data} location={location} draggable={draggable} current={current} selected={selected}>
    {data.kind === 'divider' ? (
      <ThreadDivider label={data.label} />
    ) : (
      <Message.Group messages={data.messages} continues={!data.last} />
    )}
  </Mosaic.Tile>
);

export type ThreadMessagesProps = ThemedClassName<{
  messages: readonly MessageType.Message[];
  /** Stable id of the owning thread; scopes the Mosaic container so multiple threads don't collide. */
  id?: string;
  /** Estimated tile height for the virtualizer. */
  estimateSize?: number;
  currentId?: string;
  /** Consecutive same-sender messages within this window (ms) are merged into one tile. */
  groupWindowMs?: number;
  /** Whether to insert a labeled divider before the first message of each calendar day. */
  dayDivider?: boolean;
  /** A same-day gap exceeding this (ms) inserts an unlabeled divider between groups. */
  gapDividerMs?: number;
}>;

const DEFAULT_GROUP_WINDOW_MS = 60_000;
const DEFAULT_GAP_DIVIDER_MS = 3 * 60 * 60 * 1000;

/** Virtualized stack of message tiles (via Mosaic), within an internal scroll area. */
const ThreadMessages = ({
  messages,
  id,
  estimateSize = 80,
  currentId,
  groupWindowMs = DEFAULT_GROUP_WINDOW_MS,
  dayDivider = true,
  gapDividerMs = DEFAULT_GAP_DIVIDER_MS,
  classNames,
}: ThreadMessagesProps) => {
  const { dtLocale } = useTranslation(translationKey);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const items = useMemo(
    () => groupMessages(messages.filter(Boolean), { groupWindowMs, dayDivider, gapDividerMs, dtLocale }),
    [messages, groupWindowMs, dayDivider, gapDividerMs, dtLocale],
  );
  // Stable handler identity; the id scopes the container so concurrent threads don't clobber each other in the Mosaic registry.
  const eventHandler = useMemo<MosaicEventHandler>(
    () => ({ id: id ? `thread-${id}` : 'thread', canDrop: () => false }),
    [id],
  );

  return (
    <Mosaic.Container
      asChild
      orientation='vertical'
      autoScroll={viewport}
      currentId={currentId}
      eventHandler={eventHandler}
    >
      <ScrollArea.Root classNames={mx('col-span-2 flex-1 min-h-0', classNames)} orientation='vertical'>
        <ScrollArea.Viewport ref={setViewport}>
          <Mosaic.VirtualStack
            Tile={ThreadItemAdapter}
            items={items}
            getId={getThreadItemId}
            draggable={false}
            getScrollElement={() => viewport}
            estimateSize={() => estimateSize}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Mosaic.Container>
  );
};

ThreadMessages.displayName = 'Thread.Messages';

//
// Textbox
//

export type ThreadTextboxProps = MessageMetadata & {
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  extensions?: Extension;
  /**
   * Called with the composer content on send. Return `true` to accept (the
   * editor is cleared and remounted), `false` to reject.
   */
  onSend?: (text: string) => boolean;
};

/** Message composer pinned at the foot of a thread. */
const ThreadTextbox = ({ placeholder, autoFocus, disabled, extensions, onSend, ...metadata }: ThreadTextboxProps) => {
  const { t } = useTranslation(translationKey);
  const { themeMode } = useThemeContext();
  const { registerComposerFocus } = useThreadContext('Thread.Textbox');
  const composerRef = useRef<{ focus: () => void } | null>(null);
  const messageRef = useRef('');
  const [count, setCount] = useState(0);

  // Expose the composer's focus to Thread.Root so the header caret can focus it.
  useEffect(() => {
    registerComposerFocus(() => composerRef.current?.focus());
    return () => registerComposerFocus(undefined);
  }, [registerComposerFocus]);

  const editorExtensions = useMemo(
    () =>
      [
        createBasicExtensions({ placeholder: placeholder ?? t('message.placeholder') }),
        createThemeExtensions({ themeMode }),
        listener({ onChange: ({ text }) => (messageRef.current = text) }),
        command,
        extensions,
      ].filter(Boolean) as Extension[],
    [themeMode, placeholder, t, extensions, count],
  );

  const handleSend = useCallback(() => {
    const text = messageRef.current;
    if (!text?.length || !onSend) {
      return;
    }
    if (onSend(text)) {
      messageRef.current = '';
      setCount((value) => value + 1);
    }
  }, []);

  return (
    <Message.Textbox
      ref={composerRef}
      {...metadata}
      autoFocus={autoFocus}
      disabled={disabled}
      extensions={editorExtensions}
      onSend={handleSend}
    />
  );
};

ThreadTextbox.displayName = 'Thread.Textbox';

//
// Status
//

export type ThreadStatusProps = ThemedClassName<PropsWithChildren> & {
  activity?: boolean;
};

const ThreadStatus = forwardRef<HTMLDivElement, ThreadStatusProps>(
  ({ activity, classNames, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <div
        {...props}
        className={mx(
          'col-start-2 grid grid-cols-[min-content_1fr_max-content] pb-2 pe-2 text-xs text-description',
          classNames,
        )}
        ref={forwardedRef}
      >
        <Icon
          icon='ph--spinner--bold'
          classNames='w-6 h-4 invisible data-[visible=show]:visible animate-spin-slow'
          data-visible={activity ? 'show' : 'hide'}
        />
        <span className='truncate min-w-0' aria-live='polite'>
          {activity ? children : null}
        </span>
        <span className={mx('text-end', hoverableControlItem)}>{t('enter-to-send.message')}</span>
      </div>
    );
  },
);

ThreadStatus.displayName = 'Thread.Status';

//
// Thread
//

export const Thread = {
  Root: ThreadRoot,
  Content: ThreadContent,
  Header: ThreadHeader,
  Messages: ThreadMessages,
  Textbox: ThreadTextbox,
  Status: ThreadStatus,
};
