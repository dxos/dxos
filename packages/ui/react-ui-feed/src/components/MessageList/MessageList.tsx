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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Column, ScrollArea, type ScrollAreaRootProps, composable, composableProps, setRef } from '@dxos/react-ui';
import { type Message } from '@dxos/types';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { type ItemContent, type MessageRenderer, type SearchHit, defaultRenderer } from '../../model';
import { type HighlightRange, HtmlItem, MarkdownItem, SelectionGroupContext, createSelectionGroup } from '../Item';
import { type FollowOptions, ScrollFollower } from './follow';
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
  /** Block widgets mounted across every mounted item — what the visible window actually costs. */
  mountedWidgets: number;
  reportWidgets: (id: string, count: number) => void;
  /** Rows that moved on screen against the scroll, counted per animation frame. */
  jumps: { count: number; worst: number };
  /** Rows that moved after being laid out, and windows whose offsets were out of order. */
  shifts: number;
  breaks: number;
  resetShifts: () => void;
  virtualizer: Virtualizer<HTMLElement, HTMLElement>;
  /** Row ref: measures the element and feeds the running average behind `estimateSize`. */
  measureItem: (element: HTMLElement | null) => void;
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
  /** Message currently streaming; its item reconciles by delta rather than remounting. */
  streamingId?: string;
  /** Message ids selected as a set (list-shaped gesture, distinct from text selection). */
  selectedIds?: ReadonlySet<string>;
  onSelectedIdsChange?: (ids: ReadonlySet<string>) => void;
  /** Search hits from the model; the list routes them to the items that own them. */
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
  /** Outline each item and the blocks inside it, so what the layout is measuring is visible. */
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
  Custom,
  streamingId,
  selectedIds,
  onSelectedIdsChange,
  hits,
  isAnchor,
  debug,
  estimateSize = DEFAULT_ESTIMATE,
  stickyBottom = false,
  stickyBehavior = 'auto',
  follow: followOptions,
  overscan = 8,
  onRangeChange,
}: MessageListRootProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [range, setRange] = useState<MessageRange | undefined>(undefined);

  // One number standing in for the caller's estimate wherever a single value is needed — the opening
  // offset, the fallback row height — since a per-row estimator answers about a row, not the feed.
  const nominalSize = typeof estimateSize === 'number' ? estimateSize : DEFAULT_ESTIMATE;

  // The reader's position as an index rather than a pixel offset: what the arrow keys step through,
  // what navigation sets, and what a minimap or a counter reports. Mirrored in a ref because the
  // keymap is bound to the element once and would otherwise step from a captured value.
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

  // Running average of the rows measured so far. The estimate governs every row the list has not
  // rendered — the total height, the scrollbar, and which window a jump lands in — so a wrong one is
  // not a slow start but a document of the wrong length, corrected row by row as the reader travels
  // through it. Averaging the real heights replaces the guess after the first handful of rows.
  const measured = useRef({ sizes: new Map<string, number>(), total: 0 });

  // Read through a ref: the virtualizer is constructed before the anchor exists, and its options are
  // captured once per render.
  const anchoredMeasureRef = useRef<
    | ((
        element: Element,
        entry: ResizeObserverEntry | undefined,
        instance: Virtualizer<HTMLElement, HTMLElement>,
      ) => number)
    | null
  >(null);

  const virtualizer = useVirtualizer<HTMLElement, HTMLElement>({
    count: messages.length,
    getScrollElement: () => viewport,
    // Deliberately reads refs rather than state: the virtualizer calls this while computing a
    // layout, and re-rendering to publish a new average would recompute the layout it is inside.
    estimateSize: useCallback(
      (index: number) => {
        const message = messages[index];
        if (typeof estimateSize === 'function' && message) {
          return estimateSize(message, index);
        }

        const { sizes, total } = measured.current;
        return sizes.size >= MEASURED_SAMPLE ? Math.round(total / sizes.size) : nominalSize;
      },
      [estimateSize, nominalSize, messages],
    ),
    // Key measurements by message id, not index: a prepended page or a rewind would otherwise
    // shift every cached height by one row and the scrollbar would jump.
    getItemKey: useCallback((index: number) => messages[index]?.id ?? index, [messages]),
    // A feed that opens at its tail should mount the tail, and only the tail. Without this the first
    // commit builds the window at offset 0, the sticky effect then scrolls to the bottom, and every
    // row is constructed twice — once at each end of the document. Each row is an `EditorView`, so
    // that doubling is the largest single cost in the list's lifetime: a deliberately low estimate
    // mounts tens of editors per window, and the pair of them lands as one stalled frame.
    //
    // Read once, at construction: the virtualizer only consults this while it has no scroll offset
    // of its own, and the sticky effect corrects the real `scrollTop` on the next frame.
    initialOffset: stickyBottom ? () => messages.length * nominalSize : undefined,
    overscan,
  });

  // Keyed by message id rather than index, so a row counted once is not counted again when the feed
  // shifts beneath it.
  const measureItem = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        const id = element.dataset.objectId;
        const size = element.offsetHeight;
        if (id && size) {
          const { sizes, total } = measured.current;
          measured.current.total = total + size - (sizes.get(id) ?? 0);
          sizes.set(id, size);
        }
      }

      virtualizer.measureElement(element);
    },
    [virtualizer],
  );

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
    const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : nominalSize;
    return Math.min(median, viewport?.clientHeight || median);
  }, [virtualizer, nominalSize, viewport]);
  const follower = useMemo(
    () => (viewport ? new ScrollFollower(viewport, { ...followOptions, rowHeight }) : undefined),
    [viewport, followOptions?.maxSpeed, followOptions?.acceleration, followOptions?.deceleration, rowHeight],
  );
  useEffect(() => () => follower?.cancel(), [follower]);

  // What a reader would call flicker: a row moving on screen by more than the scroll moved, sampled
  // once per frame so the reading is of what was painted. Only while debugging — it reads every
  // mounted row's box every frame.
  const jumps = useJumpDetector(viewport, debug);

  // Where each row was placed, and whether it stayed there. A row that moves after it was laid out
  // is what the reader sees as flicker, and it happens scrolling up, where unmeasured rows enter.
  const {
    shifts,
    breaks,
    last: lastShift,
    trace: shiftTrace,
    record: recordPositions,
    reset: resetShifts,
  } = usePositionLog();
  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    recordPositions(
      virtualItems.map(({ key, index, start }) => ({ key, index, start })),
      // The offset the layout was computed against, not the element's current `scrollTop`: reading
      // the DOM here samples a scroll that has moved on since, and every row then looks displaced by
      // exactly one frame of travel.
      { scrollOffset: virtualizer.scrollOffset ?? 0 },
    );
  }, [virtualItems, recordPositions, virtualizer]);

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
  const scrolledAt = useRef(0);

  // Hold the row the reader is on still while first-time measurements correct the layout under it.
  // Suspended while following the tail, where the bottom is the anchor and the follow owns the
  // scroll — two things writing `scrollTop` would fight.
  useEffect(() => {
    if (!viewport) {
      return;
    }

    const onGesture = () => {
      gestureRef.current = performance.now();
    };

    const onScroll = () => {
      scrolledAt.current = performance.now();
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

  const scrollToBottom = useCallback(
    (options?: ScrollToOptions) => {
      if (messages.length) {
        scrollToIndex(messages.length - 1, { align: 'end', ...options });
      }
    },
    [scrollToIndex, messages.length],
  );

  // Re-base the layout on what the rows actually measure, anchored on the reader's position.
  //
  // A new average only reaches the rows below the last one measured: the virtualizer rebuilds its
  // measurements from the earliest pending index, so everything above keeps the height it was first
  // laid out with. A feed opened at its tail therefore keeps a document sized by the original
  // estimate — 2,000 rows at 24px where they measure 130 — and the scrollbar, the total height and
  // every jump to an index stay wrong for as long as the reader does not travel through them.
  //
  // The rebuild is triggered by resizing row 0 to the average, which is the one supported way to
  // make the virtualizer start again from the top: it resumes from its earliest pending measurement,
  // so a tail-anchored feed otherwise rebuilds only the tail for ever. Clearing its caches outright
  // does not work — the mounted rows re-measure before the rebuild runs, and the resumption point
  // lands back at the tail over an emptied cache, leaving a layout with holes in it.
  //
  // Every real measurement is kept; only rows that were standing on the estimate move. The rebuild
  // shifts every offset, so the reader is put back where they were: at the tail if they were
  // following it, otherwise on the message they were on. Converges — the average becomes the basis,
  // so the next comparison is against itself.
  const basis = useRef(nominalSize);
  const rebases = useRef(0);
  useEffect(() => {
    // A caller estimating per row is already better informed than an average over every row.
    const { sizes, total } = measured.current;
    if (typeof estimateSize === 'function' || sizes.size < MEASURED_SAMPLE) {
      return;
    }

    const average = Math.round(total / sizes.size);
    if (!average || Math.abs(average - basis.current) / basis.current < REBASE_THRESHOLD) {
      return;
    }

    // Never while the reader is moving. A rebuild moves every offset in the list, so doing it under
    // a scroll is a row changing place beneath the eye — which is what "flicker" is, and it shows
    // going up, where unmeasured rows enter and the average is still moving. Deferred to the next
    // quiet moment: measurements keep arriving, so this effect runs again.
    if (performance.now() - scrolledAt.current < REBASE_QUIET || rebases.current >= REBASE_LIMIT) {
      return;
    }

    rebases.current++;

    basis.current = average;
    const anchor = currentIndexRef.current;
    virtualizer.resizeItem(0, average);
    if (stickyBottom && followRef.current) {
      scrollToBottom();
    } else {
      virtualizer.scrollToIndex(anchor, { align: 'start' });
    }
  });

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
        virtualizer,
        follower,
        get following() {
          return followRef.current;
        },
        get positioned() {
          return positioned.current;
        },
        get shifted() {
          return { shifts, breaks, last: lastShift, recent: shiftTrace.current };
        },
        get measured() {
          const { sizes, total } = measured.current;
          return { rows: sizes.size, average: sizes.size ? Math.round(total / sizes.size) : 0, basis: basis.current };
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

  // From the cursor rather than from the last stop: a reader who scrolled between two prompts expects
  // the next press to take them to the one they are approaching, not back to where they last stopped.
  const stepAnchor = useCallback(
    (delta: number) => {
      if (!anchors.length) {
        return;
      }

      const current = currentIndexRef.current;
      const next =
        delta > 0
          ? (anchors.find((index) => index > current) ?? anchors[anchors.length - 1])
          : ([...anchors].reverse().find((index) => index < current) ?? anchors[0]);

      scrollToIndex(next, { align: next === messages.length - 1 ? 'end' : 'start', behavior: 'smooth' });
    },
    [anchors, scrollToIndex, messages.length],
  );

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

      event.preventDefault();
      if (event.metaKey || event.ctrlKey) {
        const target = delta > 0 ? messages.length - 1 : 0;
        scrollToIndex(target, { align: target === messages.length - 1 ? 'end' : 'start', behavior: 'smooth' });
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
        mountedWidgets={mountedWidgets}
        reportWidgets={reportWidgets}
        jumps={jumps}
        shifts={shifts}
        breaks={breaks}
        resetShifts={resetShifts}
        virtualizer={virtualizer}
        measureItem={measureItem}
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
> & {
  /**
   * Gutter size for the three-track layout each row is laid out on (`gutter | content | gutter`).
   *
   * The tracks live inside the row rather than on the container, because rows are placed at the
   * offsets the virtualizer computes and cannot be items of an outer grid. Chrome that wants the
   * gutters — a fork control, an avatar, a resolve toggle — opts in with `Column.Row`; everything
   * else sits in the centre track.
   */
  gutter?: 'sm' | 'md' | 'lg';
};

/**
 * The scroll container and the mounted window of rows.
 *
 * Scrolling belongs to `ScrollArea`, which owns the overlay thumbs and the padding tokens; the
 * virtualizer needs only the element being scrolled, which `ScrollArea.Viewport` publishes.
 */
const MessageListViewport = composable<HTMLDivElement, MessageListViewportExtra>(
  ({ autoHide, centered, native, padding, scrollbars, thin, gutter, ...props }, forwardedRef) => {
    const { messages, Chrome, selectedIds, virtualizer, measureItem, setViewport, onSelect } =
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
                <MessageListRow
                  key={item.key}
                  index={item.index}
                  start={item.start}
                  message={message}
                  measure={measureItem}
                >
                  <Column.Root gutter={gutter}>
                    <Column.Center>
                      <Chrome
                        message={message}
                        index={item.index}
                        selected={selectedIds?.has(message.id) ?? false}
                        onSelect={onSelect}
                      >
                        <MessageListItem message={message} />
                      </Chrome>
                    </Column.Center>
                  </Column.Root>
                </MessageListRow>
              );
            })}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

MessageListViewport.displayName = MESSAGE_LIST_VIEWPORT_NAME;

/**
 * One placed row.
 *
 * The measurement is taken in a **layout effect**, not in the element's ref callback, and that is the
 * whole point of this component. React attaches refs before it runs any layout effect, so a row
 * measured from its ref is measured before its item has built anything — an editor is constructed in
 * the item's own layout effect — and the virtualizer records the height of an empty box. The real
 * height arrives a frame later as a correction, which moves every row below it: a jump per row, worst
 * on first load and when scrolling up, where rows mount continuously.
 *
 * Layout effects run child-first, so by the time this one fires the item's content exists and the
 * first measurement is the right one.
 */
const MessageListRow = ({
  index,
  start,
  message,
  measure,
  children,
}: PropsWithChildren<{
  index: number;
  start: number;
  message: Message.Message;
  measure: (element: HTMLElement | null) => void;
}>) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    measure(ref.current);
  }, [measure]);

  return (
    <div
      ref={ref}
      data-index={index}
      data-object-id={message.id}
      className='absolute inset-x-0 top-0'
      style={{ transform: `translateY(${start}px)` }}
    >
      {children}
    </div>
  );
};

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
        <MarkdownItem text={content.text} registry={registry} hits={hits} onWidgetsChange={handleWidgetsChange} />
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
