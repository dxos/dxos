//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type Virtualizer, useVirtualizer } from '@tanstack/react-virtual';
import React, {
  type ComponentType,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ScrollArea, type ScrollAreaRootProps, composable, composableProps, setRef } from '@dxos/react-ui';
import { type Message } from '@dxos/types';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { type MessageRenderer, type SearchHit, defaultRenderer } from '../../model';
import { type HighlightRange, HtmlItem, MarkdownItem, SelectionGroupContext, createSelectionGroup } from '../Item';
import { type FollowOptions, ScrollFollower } from './follow';

//
// Context
//

const MESSAGE_LIST_NAME = 'MessageList';

/** Per-message chrome (avatar, timestamp, fork/rewind/reply controls), supplied by the host. */
export type MessageChromeProps = PropsWithChildren<{
  message: Message.Message;
  index: number;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
}>;

export type MessageRange = { startIndex: number; endIndex: number };

type MessageListContextValue = {
  messages: readonly Message.Message[];
  renderer: MessageRenderer;
  registry?: XmlWidgetRegistry;
  Chrome: ComponentType<MessageChromeProps>;
  streamingId?: string;
  selectedIds?: ReadonlySet<string>;
  hitsByMessage: ReadonlyMap<string, HighlightRange[]>;
  /** The mounted window; `undefined` until the viewport has measured. */
  range?: MessageRange;
  /** Index the reader is on: moved by the arrow keys and by any navigation, tracked while scrolling. */
  currentIndex: number;
  virtualizer: Virtualizer<HTMLElement, HTMLElement>;
  setViewport: (viewport: HTMLElement | null) => void;
  onSelect: (id: string, additive: boolean) => void;
  scrollToIndex: (index: number, options?: ScrollToOptions) => void;
  scrollToBottom: (options?: ScrollToOptions) => void;
};

export type ScrollToOptions = {
  align?: 'start' | 'center' | 'end';
  behavior?: 'auto' | 'smooth';
};

const [MessageListProvider, useMessageListContext] = createContext<MessageListContextValue>(MESSAGE_LIST_NAME);

/**
 * The list's state and scroll controls, for parts that live outside the viewport — a toolbar's
 * find-next, a statusbar's range readout.
 */
export const useMessageList = (consumerName = 'useMessageList') => {
  const { range, currentIndex, messages, scrollToIndex, scrollToBottom } = useMessageListContext(consumerName);
  return { range, currentIndex, count: messages.length, scrollToIndex, scrollToBottom };
};

//
// Root
//

export type MessageListRootProps = PropsWithChildren<{
  messages: readonly Message.Message[];
  renderer?: MessageRenderer;
  registry?: XmlWidgetRegistry;
  /**
   * Chrome wrapper; receives the item as `children`. Defaults to a bare frame.
   * Chrome must be layout-stable: a control that changes a row's height on hover or focus
   * re-triggers measurement, and a pointer travelling down the list mid-scroll then shifts every
   * row below it. Toggle such affordances with opacity, or take them out of flow.
   */
  Chrome?: ComponentType<MessageChromeProps>;
  /** Message currently streaming; its item reconciles by delta rather than remounting. */
  streamingId?: string;
  /** Message ids selected as a set (list-shaped gesture, distinct from text selection). */
  selectedIds?: ReadonlySet<string>;
  onSelectedIdsChange?: (ids: ReadonlySet<string>) => void;
  /** Search hits from the model; the list routes them to the items that own them. */
  hits?: readonly SearchHit[];
  /** Estimated row height before measurement; a bad estimate shows up as scrollbar drift. */
  estimateSize?: number;
  /** Pin to the bottom as messages arrive, and as a streaming message grows (chat behaviour). */
  stickyBottom?: boolean;
  /**
   * How the sticky follow moves while `streamingId` is set; every other height change snaps, so a
   * populated feed opens already at the tail rather than travelling there. @default 'auto'
   */
  stickyBehavior?: ScrollToOptions['behavior'];
  /** Travel speeds for the smooth follow, in rows/s. */
  follow?: FollowOptions;
  overscan?: number;
  onRangeChange?: (range: MessageRange) => void;
}>;

const DefaultChrome = ({ children }: MessageChromeProps) => <>{children}</>;

/** Rows beyond which a requested smooth scroll goes instantly instead; see `scrollToIndex`. */
const SMOOTH_SCROLL_LIMIT = 10;

/** Distance from the tail within which scrolling counts as returning to the bottom. */
const STICKY_THRESHOLD = 32;

/** How long after a gesture a scroll is still attributable to the reader. */
const GESTURE_WINDOW = 300;

/**
 * Headless root of a feed: owns the virtualizer, the selection group and the model-to-item mapping.
 * Renders no DOM of its own, so a toolbar or statusbar that reads its state can sit outside the
 * scroll container — the scrolling part is `MessageList.Viewport`.
 */
const MessageListRoot = ({
  children,
  messages,
  renderer = defaultRenderer,
  registry,
  Chrome = DefaultChrome,
  streamingId,
  selectedIds,
  onSelectedIdsChange,
  hits,
  estimateSize = 120,
  stickyBottom = false,
  stickyBehavior = 'auto',
  follow: followOptions,
  overscan = 8,
  onRangeChange,
}: MessageListRootProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [range, setRange] = useState<MessageRange | undefined>(undefined);

  // The reader's position as an index rather than a pixel offset: what the arrow keys step through,
  // what navigation sets, and what a minimap or a counter reports. Mirrored in a ref because the
  // keymap is bound to the element once and would otherwise step from a captured value.
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const setCurrent = useCallback((index: number) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
  }, []);

  const virtualizer = useVirtualizer<HTMLElement, HTMLElement>({
    count: messages.length,
    getScrollElement: () => viewport,
    estimateSize: () => estimateSize,
    // Key measurements by message id, not index: a prepended page or a rewind would otherwise
    // shift every cached height by one row and the scrollbar would jump.
    getItemKey: useCallback((index: number) => messages[index]?.id ?? index, [messages]),
    overscan,
  });

  // The follow carries velocity across frames, so a target that moves with every chunk produces one
  // continuous travel rather than an animation restarted per chunk.
  //
  // Speeds are in rows, so a row needs a height. The median of what is on screen, rather than the
  // mean of everything: a streaming answer is enormous beside a handful of short messages, so the
  // mean tracks that one row and the follow accelerates with it — the speed then honours its limit
  // in rows while ignoring it entirely in pixels. Capped at the viewport because a row taller than
  // the screen makes "rows per second" meaningless as a rate.
  const rowHeight = useCallback(() => {
    const sizes = virtualizer
      .getVirtualItems()
      .map((item) => item.size)
      .sort((a, b) => a - b);
    const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : estimateSize;
    return Math.min(median, viewport?.clientHeight || median);
  }, [virtualizer, estimateSize, viewport]);
  const follower = useMemo(
    () => (viewport ? new ScrollFollower(viewport, { ...followOptions, rowHeight }) : undefined),
    [viewport, followOptions?.maxSpeed, followOptions?.acceleration, followOptions?.deceleration, rowHeight],
  );
  useEffect(() => () => follower?.cancel(), [follower]);

  const mounted = virtualizer.getVirtualItems().length;
  const startIndex = virtualizer.range?.startIndex;
  const endIndex = virtualizer.range?.endIndex;
  useEffect(() => {
    // An emptied list keeps whatever range it last reported, so clear it rather than leave a
    // readout describing rows that are gone.
    const next =
      messages.length && startIndex !== undefined && endIndex !== undefined ? { startIndex, endIndex } : undefined;
    setRange(next);
    if (next) {
      onRangeChange?.(next);
      // Scrolling past the cursor moves it: a wheel or a scrollbar drag is the reader relocating,
      // so the next arrow press should step from where they now are, not from where they were.
      if (currentIndexRef.current < next.startIndex || currentIndexRef.current > next.endIndex) {
        setCurrent(next.startIndex);
      }
    }
  }, [mounted, startIndex, endIndex, messages.length, onRangeChange, setCurrent]);

  // Following is an intent, and only the reader can withdraw it.
  //
  // Neither of the obvious signals can tell the reader apart from the machinery. Distance says a
  // tail growing faster than the follow travels is a reader who scrolled away; direction says the
  // same of a row above being re-measured smaller, or of the virtualizer correcting its own
  // estimate — and either way the follow switches off for good and the feed stops following.
  //
  // Input events can: the follow writes `scrollTop`, it does not turn wheels or press keys. So a
  // scroll counts as the reader's only when a gesture preceded it, and returning to the tail — by
  // any means — opts back in.
  const followRef = useRef(true);
  const gestureRef = useRef(0);
  useEffect(() => {
    if (!viewport) {
      return;
    }

    const onGesture = () => {
      gestureRef.current = performance.now();
    };

    const onScroll = () => {
      const atTail = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < STICKY_THRESHOLD;
      if (atTail) {
        followRef.current = true;
      } else if (performance.now() - gestureRef.current < GESTURE_WINDOW) {
        followRef.current = false;
        follower?.cancel();
      }
    };

    onScroll();
    viewport.addEventListener('scroll', onScroll, { passive: true });
    // Every way a reader can move a scroll container by hand: the wheel, a touch drag, the keyboard,
    // and a pointer on the scrollbar itself.
    for (const event of ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const) {
      viewport.addEventListener(event, onGesture, { passive: true });
    }

    return () => {
      viewport.removeEventListener('scroll', onScroll);
      for (const event of ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const) {
        viewport.removeEventListener(event, onGesture);
      }
    };
  }, [viewport, follower]);

  const scrollToIndex = useCallback(
    (index: number, { align = 'start', behavior = 'auto' }: ScrollToOptions = {}) => {
      // Asking to be somewhere is an answer to "do you want the tail?". Navigating into the feed
      // withdraws the follow — otherwise the next message drags the reader back from wherever they
      // just asked to be — and asking for the last message opts back in.
      followRef.current = index >= messages.length - 1;
      if (!followRef.current) {
        follower?.cancel();
      }

      setCurrent(index);

      // A smooth scroll is driven from the offset the virtualizer computes, because the virtualizer
      // itself refuses to animate under dynamic measurement (it warns and scrolls instantly).
      //
      // Beyond a few rows that offset is an estimate for everything not yet measured, so the
      // animation travels to the wrong place and corrects on arrival. A far jump therefore goes
      // instantly — the reader loses no continuity across a distance they could not have followed.
      const distance = Math.abs(index - (virtualizer.range?.startIndex ?? 0));
      const offset =
        behavior === 'smooth' && distance <= SMOOTH_SCROLL_LIMIT
          ? virtualizer.getOffsetForIndex(index, align)?.[0]
          : undefined;
      if (offset !== undefined && viewport) {
        viewport.scrollTo({ top: offset, behavior: 'smooth' });
      } else {
        virtualizer.scrollToIndex(index, { align });
      }
    },
    [virtualizer, viewport, follower, messages.length, setCurrent],
  );

  const scrollToBottom = useCallback(
    (options?: ScrollToOptions) => {
      if (messages.length) {
        scrollToIndex(messages.length - 1, { align: 'end', ...options });
      }
    },
    [scrollToIndex, messages.length],
  );

  // Keyed on the total size as well as the count: a growing tail extends the last row without
  // adding a message, so following it means reacting to the height the virtualizer measured, not
  // to how many messages exist.
  //
  // What the follow chases is the tail as it stands, not whatever produced it. The follower
  // recomputes its target every frame, so content arriving faster than the travel simply keeps the
  // target ahead; when the arrivals stop, the follow is still under way and lands by decelerating
  // rather than being cut short. Tying this to a streaming flag instead would snap the moment a
  // stream ended, discarding exactly the distance it had left to cover.
  const positioned = useRef(false);
  const totalSize = virtualizer.getTotalSize();
  useEffect(() => {
    // Why a follow is or is not running is invisible from the outside — the state lives in refs and
    // an animation frame — and every wrong guess about it costs a round of debugging. Published on
    // the element so it can be read from the console: `$0.__feed`.
    //
    // Getters, not a snapshot: these refs are written outside React (by the scroll listener and by
    // `scrollToIndex`), so a captured value would report the state as of the last render and send
    // the next reader down the wrong path — which is precisely what this exists to prevent.
    if (viewport) {
      (viewport as any).__feed = {
        follower,
        get following() {
          return followRef.current;
        },
        get positioned() {
          return positioned.current;
        },
      };
    }

    if (!follower || !stickyBottom || !followRef.current) {
      follower?.stop();
      return;
    }

    // Opening a populated feed is not motion to follow: arrive at the tail rather than travel to
    // it. Through the virtualizer rather than by writing `scrollTop`, because on first render the
    // total size is mostly estimate — a raw jump lands at a position the mounted window does not
    // cover and the feed opens blank.
    if (!positioned.current || stickyBehavior !== 'smooth') {
      positioned.current = positioned.current || messages.length > 0;
      follower.cancel();
      scrollToBottom();
      return;
    }

    follower.start();
  }, [viewport, follower, stickyBottom, stickyBehavior, messages.length, totalSize, scrollToBottom]);

  // Arrow keys move by message, not by line: a plain arrow steps the cursor to the adjacent message
  // and Cmd/Ctrl + Arrow jumps to the first or last. Stepping the index rather than letting the
  // container scroll by a notch is what makes the position readable — a few pixels into a tall
  // message leaves every index-based readout on the message the reader has already left.
  //
  // Bound imperatively to the viewport element (rather than as a React prop) because
  // `ScrollArea.Viewport` narrows its props to the slottable set, and wrapping it in a focusable div
  // would insert a box into the height chain. `scrollToIndex` decides whether the jump animates.
  useEffect(() => {
    if (!viewport) {
      return;
    }

    // The items are non-editable, so nothing inside the list takes focus on its own; the viewport
    // has to be focusable for the keymap to have somewhere to land.
    viewport.tabIndex = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.shiftKey) {
        return;
      }

      const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      if (!delta) {
        return;
      }

      const jump = event.metaKey || event.ctrlKey;
      const target = jump
        ? delta > 0
          ? messages.length - 1
          : 0
        : Math.min(Math.max(currentIndexRef.current + delta, 0), messages.length - 1);

      event.preventDefault();
      scrollToIndex(target, { align: target === messages.length - 1 ? 'end' : 'start', behavior: 'smooth' });
    };

    viewport.addEventListener('keydown', onKeyDown);
    return () => viewport.removeEventListener('keydown', onKeyDown);
  }, [viewport, messages.length, scrollToIndex]);

  // Hits are grouped once per pass rather than filtered per item, so a search over a long feed
  // stays O(hits) instead of O(hits × visible messages).
  const hitsByMessage = useMemo(() => {
    const map = new Map<string, HighlightRange[]>();
    for (const hit of hits ?? []) {
      const ranges = map.get(hit.messageId) ?? [];
      ranges.push([hit.offset, hit.offset + hit.length]);
      map.set(hit.messageId, ranges);
    }
    return map;
  }, [hits]);

  const onSelect = useCallback(
    (id: string, additive: boolean) => {
      if (!onSelectedIdsChange) {
        return;
      }
      const next = new Set(additive ? (selectedIds ?? []) : []);
      if (additive && next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectedIdsChange(next);
    },
    [selectedIds, onSelectedIdsChange],
  );

  // The feed has one selection even though it has many editors; the group is what enforces that.
  const selectionGroup = useMemo(createSelectionGroup, []);

  return (
    <SelectionGroupContext.Provider value={selectionGroup}>
      <MessageListProvider
        messages={messages}
        renderer={renderer}
        registry={registry}
        Chrome={Chrome}
        streamingId={streamingId}
        selectedIds={selectedIds}
        hitsByMessage={hitsByMessage}
        range={range}
        currentIndex={currentIndex}
        virtualizer={virtualizer}
        setViewport={setViewport}
        onSelect={onSelect}
        scrollToIndex={scrollToIndex}
        scrollToBottom={scrollToBottom}
      >
        {children}
      </MessageListProvider>
    </SelectionGroupContext.Provider>
  );
};

MessageListRoot.displayName = 'MessageList.Root';

//
// Viewport
//

const MESSAGE_LIST_VIEWPORT_NAME = 'MessageList.Viewport';

type MessageListViewportExtra = Pick<
  ScrollAreaRootProps,
  'autoHide' | 'centered' | 'native' | 'padding' | 'scrollbars' | 'thin'
>;

/**
 * The scroll container and the mounted window of rows.
 *
 * Scrolling belongs to `ScrollArea`, which owns the overlay thumbs and the padding tokens; the
 * virtualizer needs only the element being scrolled, which `ScrollArea.Viewport` publishes.
 */
const MessageListViewport = composable<HTMLDivElement, MessageListViewportExtra>(
  ({ autoHide, centered, native, padding, scrollbars, thin, ...props }, forwardedRef) => {
    const { messages, Chrome, selectedIds, virtualizer, setViewport, onSelect } =
      useMessageListContext(MESSAGE_LIST_VIEWPORT_NAME);

    const handleViewportRef = useCallback(
      (element: HTMLDivElement | null) => {
        setViewport(element);
        setRef(forwardedRef, element);
      },
      [setViewport, forwardedRef],
    );

    return (
      <ScrollArea.Root
        {...composableProps(props)}
        orientation='vertical'
        autoHide={autoHide}
        centered={centered}
        native={native}
        padding={padding}
        scrollbars={scrollbars}
        thin={thin}
      >
        <ScrollArea.Viewport data-testid='feed.viewport' ref={handleViewportRef}>
          <div className='relative w-full' style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              // The virtualizer can still report items for the previous count on the render after a
              // feed truncates — a rewind, a filter, a space switch — and the row would throw on a
              // message that is no longer there.
              const message = messages[item.index];
              if (!message) {
                return null;
              }

              return (
                <div
                  key={item.key}
                  // `measureElement` reads the real height after the item lays out, which is what
                  // keeps a variable-height row from drifting against its estimate.
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  data-object-id={message.id}
                  className='absolute inset-x-0 top-0'
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <Chrome
                    message={message}
                    index={item.index}
                    selected={selectedIds?.has(message.id) ?? false}
                    onSelect={onSelect}
                  >
                    <MessageListItem message={message} />
                  </Chrome>
                </div>
              );
            })}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

MessageListViewport.displayName = MESSAGE_LIST_VIEWPORT_NAME;

//
// Item
//

const MESSAGE_LIST_ITEM_NAME = 'MessageList.Item';

type MessageListItemExtra = {
  message: Message.Message;
};

/**
 * One message, rendered by the kind its renderer resolves. Exposed so a host can render a message
 * outside the scrolling window — a pinned message, a preview — through the same path.
 */
const MessageListItem = composable<HTMLDivElement, MessageListItemExtra>(({ message, ...props }, forwardedRef) => {
  const { renderer, registry, hitsByMessage } = useMessageListContext(MESSAGE_LIST_ITEM_NAME);
  const content = renderer(message);
  const hits = hitsByMessage.get(message.id);

  return (
    <div {...composableProps(props)} ref={forwardedRef}>
      {content.kind === 'markdown' && <MarkdownItem text={content.text} registry={registry} hits={hits} />}
      {content.kind === 'html' && <HtmlItem html={content.html} />}
    </div>
  );
});

MessageListItem.displayName = MESSAGE_LIST_ITEM_NAME;

//
// MessageList
//

export const MessageList = {
  Root: MessageListRoot,
  Viewport: MessageListViewport,
  Item: MessageListItem,
};

export type { MessageListItemExtra as MessageListItemProps, MessageListViewportExtra as MessageListViewportProps };
