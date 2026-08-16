//
// Copyright 2026 DXOS.org
//

import { useVirtualizer } from '@tanstack/react-virtual';
import React, {
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { composable, composableProps, setRef } from '@dxos/react-ui';
import { type Message } from '@dxos/types';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { type MessageRenderer, type SearchHit, defaultRenderer } from '../../model';
import { type HighlightRange, HtmlItem, MarkdownItem, SelectionGroupContext, createSelectionGroup } from '../Item';

/** Per-message chrome (avatar, timestamp, fork/rewind/reply controls), supplied by the host. */
export type MessageChromeProps = PropsWithChildren<{
  message: Message.Message;
  index: number;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
}>;

const DefaultChrome = ({ children }: MessageChromeProps) => <>{children}</>;

export type MessageListController = {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToBottom: () => void;
  /** Visible range, for measuring how much of the feed is actually mounted. */
  getRange: () => { startIndex: number; endIndex: number } | null;
};

export type MessageListProps = {
  messages: readonly Message.Message[];
  /**
   * Imperative handle for scroll control. Separate from the component's ref, which forwards the
   * scroll container so the list can be slotted (`asChild`) into a layout part.
   */
  controllerRef?: Ref<MessageListController>;
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
  /** Search hits from the model; the engine routes them to the items that own them. */
  hits?: readonly SearchHit[];
  /** Estimated item height before measurement; a bad estimate shows up as scrollbar drift. */
  estimateSize?: number;
  /** Pin to the bottom as messages arrive (chat behaviour). */
  stickyBottom?: boolean;
  overscan?: number;
  onRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
};

/**
 * A virtualized feed of message items.
 *
 * The engine owns virtualization, chrome and selection; each message renders as its own document
 * (or arbitrary component). This is the alternative to the two shapes in the repo today: a single
 * thread-wide CodeMirror document (shared rendering, no per-message chrome) and a React tile stack
 * (per-message chrome, no shared rendering).
 */
export const MessageList = composable<HTMLDivElement, MessageListProps>(
  (
    {
      messages,
      controllerRef,
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
      ...props
    },
    forwardedRef,
  ) => {
    // The scroll container is both the virtualizer's measurement root and the component's forwarded
    // element, so the callback has to serve local state and the consumer's ref.
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const handleViewportRef = useCallback(
      (element: HTMLDivElement | null) => {
        setViewport(element);
        setRef(forwardedRef, element);
      },
      [forwardedRef],
    );

    const virtualizer = useVirtualizer({
      count: messages.length,
      getScrollElement: () => viewport,
      estimateSize: () => estimateSize,
      // Key measurements by message id, not index: a prepended page or a rewind would otherwise
      // shift every cached height by one row and the scrollbar would jump.
      getItemKey: useCallback((index: number) => messages[index]?.id ?? index, [messages]),
      overscan,
    });

    const items = virtualizer.getVirtualItems();

    useEffect(() => {
      const range = virtualizer.range;
      if (range) {
        onRangeChange?.({ startIndex: range.startIndex, endIndex: range.endIndex });
      }
    }, [items.length, virtualizer.range?.startIndex, virtualizer.range?.endIndex, onRangeChange]);

    // Stick to the bottom while new messages arrive, but only when the reader is already there —
    // yanking the viewport away from someone reading history is the classic chat-scroll defect.
    const atBottomRef = useRef(true);
    useEffect(() => {
      if (!viewport) {
        return;
      }

      const onScroll = () => {
        const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        atBottomRef.current = distance < 32;
      };
      onScroll();
      viewport.addEventListener('scroll', onScroll, { passive: true });
      return () => viewport.removeEventListener('scroll', onScroll);
    }, [viewport]);

    useEffect(() => {
      if (stickyBottom && atBottomRef.current && messages.length) {
        virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
      }
    }, [stickyBottom, messages.length, virtualizer]);

    useImperativeHandle(
      controllerRef,
      () => ({
        scrollToIndex: (index, align = 'start') => virtualizer.scrollToIndex(index, { align }),
        scrollToBottom: () => messages.length && virtualizer.scrollToIndex(messages.length - 1, { align: 'end' }),
        getRange: () => virtualizer.range ?? null,
      }),
      [virtualizer, messages.length],
    );

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

    const handleSelect = useCallback(
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
        <div
          {...composableProps(props, { classNames: 'relative overflow-y-auto' })}
          data-testid='feed.viewport'
          ref={handleViewportRef}
        >
          <div className='relative w-full' style={{ height: virtualizer.getTotalSize() }}>
            {items.map((item) => {
              const message = messages[item.index];
              return (
                <div
                  key={item.key}
                  // `measureElement` reads the real height after CodeMirror lays out, which is what
                  // keeps a variable-height item from drifting against its estimate.
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
                    onSelect={handleSelect}
                  >
                    <Item
                      message={message}
                      renderer={renderer}
                      registry={registry}
                      streaming={message.id === streamingId}
                      hits={hitsByMessage.get(message.id)}
                    />
                  </Chrome>
                </div>
              );
            })}
          </div>
        </div>
      </SelectionGroupContext.Provider>
    );
  },
);

MessageList.displayName = 'MessageList';

type ItemProps = {
  message: Message.Message;
  renderer: MessageRenderer;
  registry?: XmlWidgetRegistry;
  streaming?: boolean;
  hits?: readonly HighlightRange[];
};

const Item = ({ message, renderer, registry, hits }: ItemProps): ReactNode => {
  const content = renderer(message);
  switch (content.kind) {
    case 'markdown':
      return <MarkdownItem text={content.text} registry={registry} hits={hits} />;
    case 'html':
      return <HtmlItem html={content.html} />;
    case 'custom':
      return null;
  }
};
