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
  const { range, messages, scrollToIndex, scrollToBottom } = useMessageListContext(consumerName);
  return { range, count: messages.length, scrollToIndex, scrollToBottom };
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
   *
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
  /** Pin to the bottom as messages arrive (chat behaviour). */
  stickyBottom?: boolean;
  overscan?: number;
  onRangeChange?: (range: MessageRange) => void;
}>;

const DefaultChrome = ({ children }: MessageChromeProps) => <>{children}</>;

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
  overscan = 8,
  onRangeChange,
}: MessageListRootProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [range, setRange] = useState<MessageRange | undefined>(undefined);

  const virtualizer = useVirtualizer<HTMLElement, HTMLElement>({
    count: messages.length,
    getScrollElement: () => viewport,
    estimateSize: () => estimateSize,
    // Key measurements by message id, not index: a prepended page or a rewind would otherwise
    // shift every cached height by one row and the scrollbar would jump.
    getItemKey: useCallback((index: number) => messages[index]?.id ?? index, [messages]),
    overscan,
  });

  const mounted = virtualizer.getVirtualItems().length;
  const startIndex = virtualizer.range?.startIndex;
  const endIndex = virtualizer.range?.endIndex;
  useEffect(() => {
    if (startIndex === undefined || endIndex === undefined) {
      return;
    }
    const next = { startIndex, endIndex };
    setRange(next);
    onRangeChange?.(next);
  }, [mounted, startIndex, endIndex, onRangeChange]);

  // Stick to the bottom while new messages arrive, but only when the reader is already there —
  // yanking the viewport away from someone reading history is the classic chat-scroll defect.
  const atBottomRef = useRef(true);
  useEffect(() => {
    if (!viewport) {
      return;
    }
    const onScroll = () => {
      atBottomRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 32;
    };
    onScroll();
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [viewport]);

  const scrollToIndex = useCallback(
    (index: number, { align = 'start', behavior = 'auto' }: ScrollToOptions = {}) => {
      // The virtualizer refuses to animate under dynamic measurement (it warns and scrolls
      // instantly), so a smooth scroll is driven from the offset it computes. For a row that has
      // not been measured yet that offset is an estimate, and the landing corrects once the row
      // mounts — fine for stepping between neighbours, visible when jumping across thousands.
      const offset = behavior === 'smooth' ? virtualizer.getOffsetForIndex(index, align)?.[0] : undefined;
      if (offset !== undefined && viewport) {
        viewport.scrollTo({ top: offset, behavior: 'smooth' });
      } else {
        virtualizer.scrollToIndex(index, { align });
      }
    },
    [virtualizer, viewport],
  );

  const scrollToBottom = useCallback(
    (options?: ScrollToOptions) => {
      if (messages.length) {
        scrollToIndex(messages.length - 1, { align: 'end', ...options });
      }
    },
    [scrollToIndex, messages.length],
  );

  useEffect(() => {
    if (stickyBottom && atBottomRef.current) {
      scrollToBottom();
    }
  }, [stickyBottom, messages.length, scrollToBottom]);

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
              const message = messages[item.index];
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
