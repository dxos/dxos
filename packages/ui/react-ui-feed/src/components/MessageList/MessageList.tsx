//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentType,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Column, ScrollArea, type ScrollAreaRootProps, composable, composableProps, setRef } from '@dxos/react-ui';
import { type Message } from '@dxos/types';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { type ItemContent, type MessageRenderer, type SearchHit, defaultRenderer, useListModel } from '../../model';
import { type WindowController, type WindowState, useWindow } from '../../virtualizer';
import {
  type HighlightRange,
  HtmlItem,
  MarkdownItem,
  SelectionGroupContext,
  WidgetScopeProvider,
  WidgetStateProvider,
  createSelectionGroup,
  createWidgetStateStore,
} from '../Item';
import { useJumpDetector, usePositionLog } from './position-log';

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
  Custom?: ComponentType<{ content: ItemContent & { kind: 'custom' }; message: Message.Message }>;
  debug?: boolean;
  /** The mounted window; `undefined` until the viewport has measured. */
  range?: MessageRange;
  /** Index the reader is on: moved by the arrow keys and by any navigation, tracked while scrolling. */
  currentIndex: number;
  /** Indices the reader navigates between; every index when the host names no anchors. */
  anchors: readonly number[];
  /** Move by `delta` anchors from the cursor, and scroll there. */
  stepAnchor: (delta: number) => void;
  /** Rows mounted right now: the window the reader is paying for. */
  mountedRows: number;
  /** Block widgets mounted across every mounted item — what the visible window actually costs. */
  mountedWidgets: number;
  reportWidgets: (id: string, count: number) => void;
  /** Rows that moved on screen against the scroll, counted per animation frame. */
  jumps: { count: number; worst: number };
  /** Rows that moved after being laid out, and windows whose offsets were out of order. */
  shifts: number;
  breaks: number;
  resetShifts: () => void;
  /** The element holding the mounted rows, which is what gets measured. */
  windowRef: React.RefObject<HTMLDivElement | null>;
  /** Absolute position of the first mounted row: what that element is translated by (§7). */
  offset: number;
  /** Extent of the whole document, reserved space included — what the thumb is scaled against. */
  sizerExtent: number;
  first: number;
  last: number;
  getId: (index: number) => string;
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
  const {
    range,
    currentIndex,
    anchors,
    stepAnchor,
    mountedRows,
    mountedWidgets,
    jumps,
    shifts,
    breaks,
    resetShifts,
    messages,
    scrollToIndex,
    scrollToBottom,
  } = useMessageListContext(consumerName);
  return {
    range,
    currentIndex,
    anchors,
    stepAnchor,
    mountedRows,
    mountedWidgets,
    jumps,
    shifts,
    breaks,
    resetShifts,
    count: messages.length,
    scrollToIndex,
    scrollToBottom,
  };
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
  /**
   * Renders a `custom` item. The engine's own kinds are documents — markdown in CodeMirror, HTML —
   * and both build their content asynchronously enough to be measured wrong once. A host component
   * whose height is settled at first paint is the control case: if a feed of those still moves, the
   * fault is the list; if it does not, the fault is in what the item is building.
   */
  Custom?: ComponentType<{ content: ItemContent & { kind: 'custom' }; message: Message.Message }>;
  /**
   * Message currently streaming; its item reconciles by delta rather than remounting.
   */
  // TODO(burdon): Why is this part of the API?
  streamingId?: string;
  /**
   * Message ids selected as a set (list-shaped gesture, distinct from text selection).
   */
  // TODO(burdon): Consider selection model?
  selectedIds?: ReadonlySet<string>;
  onSelectedIdsChange?: (ids: ReadonlySet<string>) => void;
  /**
   * Search hits from the model; the list routes them to the items that own them.
   */
  // TODO(burdon): Why is this part of the API?
  hits?: readonly SearchHit[];
  /**
   * Which messages the arrow keys and the navigation controls step between.
   *
   * A feed is messages of many blocks, and what a reader navigates by is rarely "the next message":
   * in an AI chat it is the next **prompt**, since the answer between two prompts is one thing to
   * read, not several stops. The host decides, because only it knows which block carries the
   * meaning. Absent, every message is a stop.
   */
  isAnchor?: (message: Message.Message, index: number) => boolean;
  /**
   * Outline each item and the blocks inside it, so what the layout is measuring is visible.
   */
  debug?: boolean;
  /**
   * Estimated row height before measurement.
   *
   * A function is worth supplying whenever the feed's rows differ widely — a one-line prompt beside a
   * long answer — because a single number is wrong for both, and every row measured for the first
   * time then re-lays the rows below it. That correction is invisible scrolling down, where the rows
   * above have already been measured, and is the flicker a reader sees scrolling up.
   *
   * Defaults to the running average of what has been measured, which is right only when rows are
   * roughly uniform.
   */
  estimateSize?: number | ((message: Message.Message, index: number) => number);
  /**
   * Pin to the bottom as messages arrive, and as a streaming message grows (chat behaviour).
   */
  stickyBottom?: boolean;
  /**
   * Reserve empty space below the last row, so that any message — including the last — can be
   * brought to the top of the viewport.
   *
   * Without it the feed stops scrolling when the last row's bottom reaches the viewport's, so the
   * final messages can only be read at the foot of the screen and stepping to the last stop shows it
   * where it already was.
   *
   * **Known unstable, which is why it is off by default.** The reserved space is part of the scroll
   * container's height, so whatever it is computed from it also changes; `baseline/fill` shows a
   * short feed taking 230 frames to settle with it on. Sized from a nominal row rather than the last
   * row's measurement, which removes the worst of the feedback but not all of it.
   */
  scrollPastEnd?: boolean;
  overscan?: number;
  onRangeChange?: (range: MessageRange) => void;
}>;

const DefaultChrome = ({ children }: MessageChromeProps) => <>{children}</>;

/** Rows beyond which a requested smooth scroll goes instantly instead; see `scrollToIndex`. */
const SMOOTH_SCROLL_LIMIT = 10;

/** Distance from the tail within which scrolling counts as returning to the bottom. */
const STICKY_THRESHOLD = 32;

/** Row height assumed before anything has been measured. */
const DEFAULT_ESTIMATE = 120;

/** Rows that must have measured before their average is trusted over the caller's estimate. */
const MEASURED_SAMPLE = 4;

/** Relative error in the row height the layout assumes, beyond which it is rebuilt from the average. */
const REBASE_THRESHOLD = 0.25;

/** Quiet period (ms) after the last scroll before the layout may be rebuilt. */
const REBASE_QUIET = 400;

/** Rebuilds allowed per feed. The average converges; a list that keeps re-basing is thrashing. */
const REBASE_LIMIT = 3;

/** How long after a gesture a scroll is still attributable to the reader. */
const GESTURE_WINDOW = 300;

/**
 * Headless root of a feed: owns the placement, the selection group and the model-to-item mapping.
 * Renders no DOM of its own, so a toolbar or statusbar that reads its state can sit outside the
 * scroll container — the scrolling part is `MessageList.Viewport`.
 */
const MessageListRoot = ({
  children,
  messages,
  renderer = defaultRenderer,
  registry,
  Chrome = DefaultChrome,
  Custom,
  streamingId,
  selectedIds,
  onSelectedIdsChange,
  hits,
  isAnchor,
  debug,
  estimateSize = DEFAULT_ESTIMATE,
  stickyBottom = false,
  scrollPastEnd = false,
  overscan = 8,
  onRangeChange,
}: MessageListRootProps) => {
  // Owned here so it outlives every row: a widget's state must survive its row being destroyed.
  const widgetStore = useMemo(createWidgetStateStore, []);

  const [viewport, setViewportState] = useState<HTMLElement | null>(null);
  // The same element as a ref, because the placement is bound to an element rather than to a render.
  const scrollerRef = useRef<HTMLElement | null>(null);
  const setViewport = useCallback((element: HTMLElement | null) => {
    scrollerRef.current = element;
    setViewportState(element);
  }, []);

  const [range, setRange] = useState<MessageRange | undefined>(undefined);
  const [mounted, setMounted] = useState(0);

  // One number standing in for the caller's estimate wherever a single value is needed, since a
  // per-row estimator answers about a row and not about the feed.
  const nominalSize = typeof estimateSize === 'number' ? estimateSize : DEFAULT_ESTIMATE;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const setCurrent = useCallback((index: number) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
  }, []);

  // Widget census, kept per item so an item that unmounts takes its own widgets out of the total.
  // Batched into state rather than counted on every report: a scroll mounts and unmounts several
  // items per frame, and a readout is not worth a render each.
  const widgetCounts = useRef(new Map<string, number>());
  const [mountedWidgets, setMountedWidgets] = useState(0);
  const reportWidgets = useCallback((id: string, count: number) => {
    if (count) {
      widgetCounts.current.set(id, count);
    } else {
      widgetCounts.current.delete(id);
    }

    setMountedWidgets([...widgetCounts.current.values()].reduce((total, value) => total + value, 0));
  }, []);

  const getId = useCallback((index: number) => messages[index]?.id ?? `missing-${index}`, [messages]);

  // What the host says, and nothing else.
  //
  // There is no running average here and no re-base built on one. Both existed because the old
  // engine could only revise the rows below the last one it had measured, so a feed opened at its
  // tail kept a document sized by the opening guess and had to be rebuilt from the top to correct
  // it — which moved every offset in the list at once. A measurement is kept against the row's id
  // and consulted from the anchor, so a wrong estimate is wrong only for rows nobody has seen (§8).
  const extents = useMemo(
    () => ({
      of: (index: number) => {
        const message = messages[index];
        return typeof estimateSize === 'function' && message ? estimateSize(message, index) : nominalSize;
      },
    }),
    [messages, estimateSize, nominalSize],
  );

  // The viewport less a nominal row: enough for the reader to bring the last row to the top.
  //
  // Measured from the element, never read back out of the layout. It is an *input* to the sizer, so
  // anything derived from the sizer would oscillate — and deliberately not the last row's measured
  // size, which the layout also feeds.
  const reserve = useMemo(
    () => (scrollPastEnd && viewport && messages.length ? Math.max(0, viewport.clientHeight - nominalSize) : 0),
    [scrollPastEnd, viewport, messages.length, nominalSize],
  );

  const controller = useRef<WindowController>(null);
  const onWindowChange = useCallback(
    (state: WindowState) => {
      const next = state.count ? { startIndex: state.visible.first, endIndex: state.visible.last } : undefined;
      setRange(next);
      setMounted(state.mounted.last - state.mounted.first + 1);
      if (next) {
        onRangeChange?.(next);
        // The cursor is the row at the top of the viewport, derived from the scroll and never set
        // alongside it. That is what makes a press always move: the row containing the offset is the
        // one the stop above begins strictly higher than, and the stop below strictly lower.
        setCurrent(next.startIndex);
      }
    },
    [onRangeChange, setCurrent],
  );

  const windowModel = useListModel(messages as Message.Message[], (message) => message.id);
  const { placement, windowRef, offset, sizerExtent, first, last } = useWindow({
    scrollerRef,
    model: windowModel,
    extents,
    overscan,
    reserve,
    sticky: stickyBottom,
    onChange: onWindowChange,
    controllerRef: controller,
  });

  // What a reader would call flicker: a row moving on screen by more than the scroll moved, sampled
  // once per frame so the reading is of what was painted. Only while debugging — it reads every
  // mounted row's box every frame.
  const jumps = useJumpDetector(viewport, debug);

  // Where each row was placed, and whether it stayed there.
  const { shifts, breaks, trace: shiftTrace, record: recordPositions, reset: resetShifts } = usePositionLog();
  useEffect(() => {
    const rows = [];
    for (let index = first; index <= last; index++) {
      rows.push({ key: getId(index), index, start: placement.positionOf(index) });
    }

    // The offset the layout was computed against, not the element's current `scrollTop`: reading the
    // DOM here samples a scroll that has moved on since, and every row then looks displaced by
    // exactly one frame of travel.
    recordPositions(rows, { scrollOffset: placement.scroll });
  }, [first, last, offset, sizerExtent, getId, placement, recordPositions]);

  const scrollToIndex = useCallback((index: number, { align = 'start', behavior = 'auto' }: ScrollToOptions = {}) => {
    controller.current?.scrollToIndex(index, align === 'center' ? 'start' : align, behavior);
  }, []);

  const scrollToBottom = useCallback(
    (options?: ScrollToOptions) => {
      if (messages.length) {
        scrollToIndex(messages.length - 1, { align: 'end', ...options });
      }
    },
    [scrollToIndex, messages.length],
  );

  useEffect(() => {
    if (viewport) {
      // Why the list is where it is, readable from the console as `$0.__feed`.
      (viewport as any).__feed = {
        placement,
        get layout() {
          return placement.layout();
        },
        get shifted() {
          return { shifts, breaks, recent: shiftTrace.current };
        },
      };
    }
  }, [viewport, placement, shifts, breaks, shiftTrace]);

  // Ordered stops. Recomputed with the feed rather than searched on each keypress: a long thread is
  // scanned once here, and every step afterwards is a lookup.
  const anchors = useMemo(
    () =>
      isAnchor
        ? messages.reduce<number[]>((list, message, index) => {
            if (isAnchor(message, index)) {
              list.push(index);
            }
            return list;
          }, [])
        : messages.map((_, index) => index),
    [messages, isAnchor],
  );

  // Stepped from the row the cursor is on, which is the row containing the scroll offset. The stop
  // above it begins strictly higher and the stop below begins strictly lower, so every press
  // travels — an index compared against a position cannot promise that while the position is still
  // being measured.
  const stepAnchor = useCallback(
    (delta: number) => {
      if (!anchors.length) {
        return;
      }

      const at = currentIndexRef.current;
      const next =
        delta > 0
          ? (anchors.find((index) => index > at) ?? anchors[anchors.length - 1])
          : ([...anchors].reverse().find((index) => index < at) ?? anchors[0]);

      // Smooth, and it stays smooth: corrections move the window rather than the scroll, so nothing
      // cancels the animation halfway. The old engine had to make this instant for exactly that
      // reason — every other press was killed two pixels from where it started.
      scrollToIndex(next, {
        align: !scrollPastEnd && next === messages.length - 1 ? 'end' : 'start',
        behavior: 'smooth',
      });
    },
    [anchors, scrollToIndex, messages.length, scrollPastEnd],
  );

  // Arrow keys move by message, not by line: a plain arrow steps the cursor to the adjacent message
  // and Cmd/Ctrl + Arrow jumps to the first or last.
  //
  // Bound imperatively to the viewport element (rather than as a React prop) because
  // `ScrollArea.Viewport` narrows its props to the slottable set, and wrapping it in a focusable div
  // would insert a box into the height chain.
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

      event.preventDefault();
      if (event.metaKey || event.ctrlKey) {
        const target = delta > 0 ? messages.length - 1 : 0;
        scrollToIndex(target, { align: target === messages.length - 1 ? 'end' : 'start' });
        return;
      }

      stepAnchor(delta);
    };

    viewport.addEventListener('keydown', onKeyDown);
    return () => viewport.removeEventListener('keydown', onKeyDown);
  }, [viewport, messages.length, scrollToIndex, stepAnchor]);

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
      <WidgetStateProvider store={widgetStore}>
        <MessageListProvider
          messages={messages}
          renderer={renderer}
          registry={registry}
          Chrome={Chrome}
          streamingId={streamingId}
          selectedIds={selectedIds}
          hitsByMessage={hitsByMessage}
          Custom={Custom}
          debug={debug}
          range={range}
          currentIndex={currentIndex}
          anchors={anchors}
          stepAnchor={stepAnchor}
          mountedRows={mounted}
          mountedWidgets={mountedWidgets}
          reportWidgets={reportWidgets}
          jumps={jumps}
          shifts={shifts}
          breaks={breaks}
          resetShifts={resetShifts}
          windowRef={windowRef}
          offset={offset}
          sizerExtent={sizerExtent}
          first={first}
          last={last}
          getId={getId}
          setViewport={setViewport}
          onSelect={onSelect}
          scrollToIndex={scrollToIndex}
          scrollToBottom={scrollToBottom}
        >
          {children}
        </MessageListProvider>
      </WidgetStateProvider>
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
> & {
  /**
   * Gutter size for the three-track layout each row is laid out on (`gutter | content | gutter`).
   *
   * The tracks live inside the row rather than on the container, because the rows are laid out by
   * the browser inside one placed parent and cannot be items of an outer grid. Chrome that wants the
   * gutters — a fork control, an avatar, a resolve toggle — opts in with `Column.Row`; everything
   * else sits in the centre track.
   */
  gutter?: 'sm' | 'md' | 'lg';
};

/**
 * The scroll container and the mounted window of rows.
 *
 * Scrolling belongs to `ScrollArea`, which owns the overlay thumbs and the padding tokens; the
 * placement needs only the element being scrolled, which `ScrollArea.Viewport` publishes.
 */
const MessageListViewport = composable<HTMLDivElement, MessageListViewportExtra>(
  ({ autoHide, centered, native, padding, scrollbars, thin, gutter, ...props }, forwardedRef) => {
    const { messages, Chrome, selectedIds, windowRef, offset, sizerExtent, first, last, getId, setViewport, onSelect } =
      useMessageListContext(MESSAGE_LIST_VIEWPORT_NAME);

    const handleViewportRef = useCallback(
      (element: HTMLDivElement | null) => {
        setViewport(element);
        setRef(forwardedRef, element);
      },
      [setViewport, forwardedRef],
    );

    const rows = [];
    for (let index = first; index <= last; index++) {
      const message = messages[index];
      if (!message) {
        continue;
      }

      rows.push(
        // Unpositioned, and that is the point. A row that changes extent reflows the ones after it,
        // in the browser, in the same frame; placing each row ourselves meant re-placing every row
        // below it on every frame of the change — 177 re-placements for one disclosure opening (§6).
        <div key={message.id} data-index={index} data-object-id={message.id}>
          <Column.Root gutter={gutter}>
            <Column.Center>
              <Chrome
                message={message}
                index={index}
                selected={selectedIds?.has(message.id) ?? false}
                onSelect={onSelect}
              >
                <MessageListItem message={message} />
              </Chrome>
            </Column.Center>
          </Column.Root>
        </div>,
      );
    }

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
        <ScrollArea.Viewport
          data-testid='feed.viewport'
          // Off deliberately: the browser adjusting the scroll as well would be a second party
          // anchoring the same thing, and the defect this design exists to remove is exactly that.
          style={{ position: 'relative', overflowAnchor: 'none' }}
          ref={handleViewportRef}
        >
          {/* Holds no rows: it exists only to give the thumb something to measure. */}
          <div style={{ height: sizerExtent }} data-testid='feed.sizer' />
          <div
            ref={windowRef}
            className='absolute top-0 left-0 flex flex-col w-full'
            style={{ transform: `translateY(${offset}px)` }}
            data-testid='feed.window'
          >
            {rows}
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
  const { renderer, registry, hitsByMessage, Custom, debug, reportWidgets } =
    useMessageListContext(MESSAGE_LIST_ITEM_NAME);
  const content = renderer(message);
  const hits = hitsByMessage.get(message.id);
  const handleWidgetsChange = useCallback(
    (count: number) => reportWidgets(message.id, count),
    [reportWidgets, message.id],
  );

  return (
    // The outlines are the item and the block-level children of its document — which is exactly what
    // the virtualizer measures and what a widget's late paint changes.
    <div
      {...composableProps(props, {
        classNames: debug
          ? 'outline outline-1 outline-dashed outline-primary-500/50 [&_.cm-content>*]:outline [&_.cm-content>*]:outline-1 [&_.cm-content>*]:outline-dashed [&_.cm-content>*]:outline-neutral-500/40'
          : undefined,
      })}
      ref={forwardedRef}
    >
      {content.kind === 'markdown' && (
        <WidgetScopeProvider scope={message.id}>
          <MarkdownItem text={content.text} registry={registry} hits={hits} onWidgetsChange={handleWidgetsChange} />
        </WidgetScopeProvider>
      )}
      {content.kind === 'html' && <HtmlItem html={content.html} />}
      {content.kind === 'custom' && Custom && <Custom content={content} message={message} />}
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
