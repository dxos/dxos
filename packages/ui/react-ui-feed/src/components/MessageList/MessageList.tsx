//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Column,
  ColumnRootProps,
  composable,
  composableProps,
  createContext,
  IconButton,
  ScrollArea,
  type ScrollAreaRootProps,
  setRef,
} from '@dxos/react-ui';
import { type WindowController, type WindowState, useFollow, useWindow } from '@dxos/react-ui-virtual';
import { type Message } from '@dxos/types';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { type FeedNavigation, useDecorations, useFeedNavigation, useItemSelectionValue } from '../../hooks';
import { type FeedModel, type ItemContent, type MessageRenderer, defaultRenderer } from '../../model';
import {
  type HighlightRange,
  HtmlBlock,
  MarkdownBlock,
  SelectionGroupContext,
  WidgetScopeProvider,
  WidgetStateProvider,
  createSelectionGroup,
  createWidgetStateStore,
} from '../Block';
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

/**
 * The imperative handle a host outside the feed's context drives the list through — the successor
 * of a document controller, shrunk to what a message-indexed feed needs. Everything else (range,
 * census, debug) is context, read via {@link useMessageList}.
 */
export type MessageListController = {
  model: FeedModel;
  scrollToBottom: (options?: ScrollToOptions) => void;
  scrollToIndex: (index: number, options?: ScrollToOptions) => void;
  /** The one seam every navigation driver shares: toolbar, arrows, rails (SPEC F-3.2). */
  navigation: FeedNavigation;
};

type MessageListContextValue = {
  /** The feed's model: messages, identity, stops, streaming, iteration. The one source (SPEC F-7). */
  model: FeedModel;
  renderer: MessageRenderer;
  registry?: XmlWidgetRegistry;
  Chrome: ComponentType<MessageChromeProps>;
  Custom?: ComponentType<{ content: ItemContent & { kind: 'custom' }; message: Message.Message }>;
  debug?: boolean;
  /** The mounted window; `undefined` until the viewport has measured. */
  range?: MessageRange;
  /** Index the reader is on: moved by the arrow keys and by any navigation, tracked while scrolling. */
  currentIndex: number;
  /** Whether the reader is resting on the tail — what a scroll-to-bottom affordance hides against. */
  atEnd: boolean;
  /** The one seam every navigation driver calls: toolbar, arrows, outline, minimap (SPEC F-3.2). */
  navigation: FeedNavigation;
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
  setViewport: (viewport: HTMLElement | null) => void;
  scrollToIndex: (index: number, options?: ScrollToOptions) => void;
  scrollToBottom: (options?: ScrollToOptions) => void;
};

export type ScrollToOptions = {
  /** The alignments the virtualizer honours; centering is a host concern it does not have. */
  align?: 'start' | 'end';
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
    atEnd,
    navigation,
    mountedRows,
    mountedWidgets,
    jumps,
    shifts,
    breaks,
    resetShifts,
    model,
    scrollToIndex,
    scrollToBottom,
  } = useMessageListContext(consumerName);
  return {
    range,
    currentIndex,
    atEnd,
    navigation,
    mountedRows,
    mountedWidgets,
    jumps,
    shifts,
    breaks,
    resetShifts,
    model,
    count: model.count,
    scrollToIndex,
    scrollToBottom,
  };
};

//
// Root
//

export type MessageListRootProps = PropsWithChildren<{
  /**
   * The feed's model (SPEC F-7): messages and identity, the stops policy, the streaming tail, and
   * iteration (`loadBefore`/`loadAfter`, consumed when the window reaches an edge). `fromMessages`
   * adapts a plain array; ECHO/queue bindings adapt outside this package.
   *
   * What is NOT here, deliberately: search hits (decorations — `DecorationsProvider` + an item's
   * `useDecorations`), selection (`ItemSelectionProvider` + `useItemSelection`), `streamingId` and
   * `isAnchor` (model concerns). The list neither knows nor routes cross-cutting per-item data.
   */
  model: FeedModel;
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
   * Outline each item and the blocks inside it, so what the layout is measuring is visible.
   */
  debug?: boolean;
  /**
   * Estimated row height before measurement. A function is worth supplying whenever the feed's
   * rows differ widely — a one-line prompt beside a long answer — because a single number is wrong
   * for both.
   */
  estimateSize?: number | ((message: Message.Message, index: number) => number);
  /**
   * Pin to the bottom as messages arrive, and as a streaming message grows (chat behaviour).
   */
  stickyBottom?: boolean;
  /**
   * Blank lines kept below the last row, part of the resting view: the tail sits that much clear
   * of the viewport's end (breathing room above a composer). A constant number in the sizer —
   * lines × the viewport's line-height — not a mode the list has (§7).
   */
  tailLines?: number;
  overscan?: number;
  onRangeChange?: (range: MessageRange) => void;
  /** Published once the list is wired; for hosts composing chrome outside the feed's context. */
  controllerRef?: Ref<MessageListController>;
}>;

const DefaultChrome = ({ children }: MessageChromeProps) => <>{children}</>;

/** Row height assumed before anything has been measured. */
const DEFAULT_ESTIMATE = 120;

/**
 * Headless root of a feed: owns the placement, the selection group and the model-to-item mapping.
 * Renders no DOM of its own, so a toolbar or statusbar that reads its state can sit outside the
 * scroll container — the scrolling part is `MessageList.Viewport`.
 */
const MessageListRoot = ({
  children,
  model,
  renderer = defaultRenderer,
  registry,
  Chrome = DefaultChrome,
  Custom,
  debug,
  estimateSize = DEFAULT_ESTIMATE,
  stickyBottom = false,
  tailLines = 0,
  overscan = 8,
  onRangeChange,
  controllerRef,
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
        const message = model.at(index);
        return typeof estimateSize === 'function' && message ? estimateSize(message, index) : nominalSize;
      },
    }),
    [model, estimateSize, nominalSize],
  );

  // A constant input to the sizer: lines × the viewport's line-height, read once per mount. The
  // previous design derived a viewport-sized reserve from the tail's measured extents (so the last
  // prompt could reach the top), which was several moving parts — measurements, the stops policy,
  // a freshness freeze — and never reliable. A constant cannot oscillate.
  const [reserve, setReserve] = useState(0);
  useEffect(() => {
    if (!viewport || !tailLines) {
      setReserve(0);
      return;
    }

    const lineHeight = parseFloat(getComputedStyle(viewport).lineHeight) || 24;
    setReserve(Math.round(tailLines * lineHeight));
  }, [viewport, tailLines]);

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

        // Iteration is the model's (SPEC F-7.2): the window reaching an edge asks it for more, the
        // page arrives as a prepend the anchor is told about, and nothing on screen moves. The model
        // serializes and drains, so asking every commit costs nothing once the source is done.
        if (next.startIndex === 0) {
          void model.more('start');
        }
        if (next.endIndex >= model.count - 1) {
          void model.more('end');
        }
      }
    },
    [onRangeChange, setCurrent, model],
  );

  // The model *is* the window's model: FeedModel satisfies the structural contract, so there is no
  // adapter and no second copy of the truth.
  const { placement, windowRef, offset, sizerExtent, first, last } = useWindow({
    scrollerRef,
    model,
    extents,
    overscan,
    reserve,
    onChange: onWindowChange,
    controllerRef: controller,
  });

  // When the content last actually changed, as against merely re-measured: what the follow is
  // allowed to chase (a toggle near the tail grows the document too, and is the reader's business).
  const changedAtRef = useRef(performance.now());
  useEffect(() => model.subscribe(() => (changedAtRef.current = performance.now())), [model]);

  // The follow is an aspect the host composes, not part of the window (SPEC §Aspects) — the intent,
  // its withdrawal by a backwards scroll, and the glide all live there.
  const follow = useFollow({
    scrollerRef,
    placement,
    extent: sizerExtent,
    count: model.count,
    reserve,
    enabled: stickyBottom,
    changedAt: () => changedAtRef.current,
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
      rows.push({ key: model.getId(index), index, start: placement.positionOf(index) });
    }

    // The offset the layout was computed against, not the element's current `scrollTop`: reading the
    // DOM here samples a scroll that has moved on since, and every row then looks displaced by
    // exactly one frame of travel.
    recordPositions(rows, { scrollOffset: placement.scroll });
  }, [first, last, offset, sizerExtent, model, placement, recordPositions]);

  const scrollToIndex = useCallback(
    (index: number, { align = 'start', behavior = 'auto' }: ScrollToOptions = {}) => {
      // Before the write, not via the scroll event it raises: asking to be somewhere answers "do
      // you want the tail?", and the correction effect must not get a word in first.
      follow.onNavigate(index);
      controller.current?.scrollToIndex(index, align, behavior);
    },
    [follow],
  );

  const scrollToBottom = useCallback(
    (options?: ScrollToOptions) => {
      if (!model.count) {
        return;
      }

      // Already at rest: arm the follow and do nothing else — the jump re-anchors from estimates,
      // which visibly moves a reader who has not moved (seen on submit while pinned).
      const scroller = scrollerRef.current;
      if (scroller && scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 32) {
        follow.onNavigate(model.count - 1);
        return;
      }

      // The end includes the reserve: the tail rests its tail-lines clear of the viewport's edge.
      scrollToIndex(model.count - 1, { align: 'end', ...options });
    },
    [scrollToIndex, model, follow],
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

  // The one seam every driver calls (SPEC F-3.2): the toolbar's buttons, the arrows below, and the
  // rails all step through this, over the stops the model's policy names (SPEC F-3.1).
  const navigation = useFeedNavigation({
    controller,
    stops: () => model.stops(),
    current: () => currentIndexRef.current,
    count: () => model.count,
    // The follow scrolls only while content arrives AND the reader is pinned to the bottom;
    // navigating anywhere but the last row un-pins, before the jump's own scroll event fires.
    onNavigate: follow.onNavigate,
  });

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
        if (delta > 0) {
          navigation.last();
        } else {
          navigation.first();
        }
        return;
      }

      navigation.step(delta);
    };

    viewport.addEventListener('keydown', onKeyDown);
    return () => viewport.removeEventListener('keydown', onKeyDown);
  }, [viewport, navigation]);

  // The feed has one selection even though it has many editors; the group is what enforces that.
  const selectionGroup = useMemo(createSelectionGroup, []);

  // The parts are stable identities, so this republishes only when the model itself is replaced.
  useEffect(() => {
    setRef(controllerRef, { model, scrollToBottom, scrollToIndex, navigation });
    return () => {
      setRef(controllerRef, null);
    };
  }, [controllerRef, model, scrollToBottom, scrollToIndex, navigation]);

  return (
    <SelectionGroupContext.Provider value={selectionGroup}>
      <WidgetStateProvider store={widgetStore}>
        <MessageListProvider
          model={model}
          renderer={renderer}
          registry={registry}
          Chrome={Chrome}
          Custom={Custom}
          debug={debug}
          range={range}
          currentIndex={currentIndex}
          atEnd={follow.atEnd}
          navigation={navigation}
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
          setViewport={setViewport}
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
> &
  Pick<ColumnRootProps, 'gutter'> & {
    /**
     * Chrome pinned over the scroller — a scroll-to-bottom pill, a "new messages" badge.
     *
     * Mounted inside `ScrollArea.Root` because it is positioned and does not scroll, so nothing has
     * to enter the flex-height chain the placement measures.
     */
    overlay?: ReactNode;
  };

/**
 * The scroll container and the mounted window of rows.
 *
 * Scrolling belongs to `ScrollArea`, which owns the overlay thumbs and the padding tokens; the
 * placement needs only the element being scrolled, which `ScrollArea.Viewport` publishes.
 */
/**
 * Whether a message renders to nothing under the current renderer — e.g. a stats-only turn, whose
 * block the renderer deliberately maps to no output. The message stays in the model (identity,
 * stops, search all see it); only its chrome is withheld, so the reader is not shown an empty row
 * with a toolbar.
 */
const isEmptyContent = (content: ItemContent, hasCustomRenderer: boolean): boolean =>
  (content.kind === 'markdown' && !content.text.trim()) ||
  (content.kind === 'html' && !content.html.trim()) ||
  (content.kind === 'custom' && !hasCustomRenderer);

const MessageListViewport = composable<HTMLDivElement, MessageListViewportExtra>(
  ({ autoHide, centered, native, padding, scrollbars, thin, gutter = 'md', overlay, ...props }, forwardedRef) => {
    const { model, renderer, Chrome, Custom, windowRef, offset, sizerExtent, first, last, setViewport } =
      useMessageListContext(MESSAGE_LIST_VIEWPORT_NAME);
    // The value once, per-row state derived: hooks do not run in loops, and the row loop below is
    // one. Item-shaped chrome uses `useItemSelection(id)` instead.
    const { selectedIds, onSelect } = useItemSelectionValue();

    const handleViewportRef = useCallback(
      (element: HTMLDivElement | null) => {
        setViewport(element);
        setRef(forwardedRef, element);
      },
      [setViewport, forwardedRef],
    );

    const rows = [];
    for (let index = first; index <= last; index++) {
      const message = model.at(index);
      if (!message) {
        continue;
      }

      // The row div always exists — the measurement pass walks the window's children by index —
      // but an empty render mounts no chrome inside it, so it measures at zero and takes no space.
      const empty = isEmptyContent(renderer(message), Boolean(Custom));
      rows.push(
        // Unpositioned, and that is the point. A row that changes extent reflows the ones after it,
        // in the browser, in the same frame; placing each row ourselves meant re-placing every row
        // below it on every frame of the change — 177 re-placements for one disclosure opening (§6).
        <div key={message.id} data-index={index} data-object-id={message.id}>
          {!empty && (
            <Column.Root gutter={gutter}>
              {/* The widgets' query container: it must be an element whose width is definite, since
                  containment stops a descendant's content sizing it (a prompt's bubble collapses). */}
              <Column.Center classNames='dx-container-type-inline-size'>
                <Chrome
                  message={message}
                  index={index}
                  selected={selectedIds?.has(message.id) ?? false}
                  onSelect={(id, additive) => onSelect?.(id, additive)}
                >
                  <MessageListItem message={message} />
                </Chrome>
              </Column.Center>
            </Column.Root>
          )}
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
          classNames='dx-document'
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
        {overlay}
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
  const { model, renderer, registry, Custom, debug, reportWidgets } = useMessageListContext(MESSAGE_LIST_ITEM_NAME);
  const content = renderer(message);
  // The item asks for its own cross-cutting data by id (SPEC §Aspects); the list never routed it.
  const decorations = useDecorations(message.id);
  const hits = useMemo<HighlightRange[] | undefined>(
    () =>
      decorations.length
        ? decorations.map(({ range }) => [range.offset, range.offset + range.length] as HighlightRange)
        : undefined,
    [decorations],
  );
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
          <MarkdownBlock
            text={content.text}
            // The typewriter runs only for the tail the model says is streaming; every other
            // change (an edit, a view switch) lands atomically.
            stream={model.streamingId === message.id}
            registry={registry}
            hits={hits}
            onWidgetsChange={handleWidgetsChange}
          />
        </WidgetScopeProvider>
      )}
      {content.kind === 'html' && <HtmlBlock html={content.html} />}
      {content.kind === 'custom' && Custom && <Custom content={content} message={message} />}
    </div>
  );
});

MessageListItem.displayName = MESSAGE_LIST_ITEM_NAME;

//
// Nav
//

const MESSAGE_LIST_NAV_NAME = 'MessageList.Nav';

type MessageListNavExtra = {
  /** Render the jump-to-ends buttons as well as the steppers. @default true */
  ends?: boolean;
};

/**
 * The step and jump controls, on the same seam as the arrow keys and the rails (SPEC F-3.2), so a
 * reader who switches between them does not change places. Lives outside the viewport — Root is
 * headless precisely so chrome like this can sit in a toolbar.
 *
 * While any of its buttons has focus, ArrowUp/Down step and Meta(Ctrl)+Arrow jumps to the ends —
 * the same keymap the viewport itself carries, so focus landing on the toolbar does not change
 * what the keys mean.
 */
const MessageListNav = composable<HTMLDivElement, MessageListNavExtra>(({ ends = true, ...props }, forwardedRef) => {
  const { navigation } = useMessageListContext(MESSAGE_LIST_NAV_NAME);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      if (!delta || event.altKey || event.shiftKey) {
        return;
      }

      event.preventDefault();
      if (event.metaKey || event.ctrlKey) {
        if (delta > 0) {
          navigation.last();
        } else {
          navigation.first();
        }
        return;
      }

      navigation.step(delta);
    },
    [navigation],
  );

  return (
    <div role='group' {...composableProps(props)} onKeyDown={onKeyDown} ref={forwardedRef}>
      {ends && (
        <IconButton
          icon='ph--arrow-line-up--regular'
          iconOnly
          label='First message'
          variant='ghost'
          data-testid='feed.nav.top'
          onClick={() => navigation.first()}
        />
      )}
      <IconButton
        icon='ph--caret-up--regular'
        iconOnly
        label='Previous message'
        variant='ghost'
        data-testid='feed.nav.back'
        onClick={() => navigation.step(-1)}
      />
      <IconButton
        icon='ph--caret-down--regular'
        iconOnly
        label='Next message'
        variant='ghost'
        data-testid='feed.nav.forward'
        onClick={() => navigation.step(1)}
      />
      {ends && (
        <IconButton
          icon='ph--arrow-line-down--regular'
          iconOnly
          label='Last message'
          variant='ghost'
          data-testid='feed.nav.bottom'
          onClick={() => navigation.last()}
        />
      )}
    </div>
  );
});

MessageListNav.displayName = MESSAGE_LIST_NAV_NAME;

//
// MessageList
//

export const MessageList = {
  Root: MessageListRoot,
  Viewport: MessageListViewport,
  Item: MessageListItem,
  Nav: MessageListNav,
};

export type {
  MessageListItemExtra as MessageListItemProps,
  MessageListNavExtra as MessageListNavProps,
  MessageListViewportExtra as MessageListViewportProps,
};
