//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, {
  type FocusEvent,
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { createContext } from '@dxos/react-hooks';
import { type DndContainerHandler, type DndLocation, useDndRootContext } from '@dxos/react-ui-dnd';
import {
  type UseListNavigationReturn,
  type UseListSelectionReturn,
  useListNavigation,
  useListSelection,
} from '@dxos/react-ui-list';
import { Mosaic, type MosaicStackTileComponent, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Util from '@dxos/react-ui/Util';

import { AssistantNamespace } from '../../namespace.ts';
import { useChatContext } from '../Chat/index.ts';

const COLUMN_SELECTOR = '[data-column-id]';

type ChatPlaneSide = 'start' | 'end';

type ChatPlaneContextValue = {
  value?: string;
  footer: HTMLElement | null;
  setFooter: (footer: HTMLDivElement | null) => void;
  viewport: HTMLDivElement | null;
  setViewport: (viewport: HTMLDivElement | null) => void;
  navigation: UseListNavigationReturn;
  selection: UseListSelectionReturn;
  select: (id: string) => void;
  dragging: boolean;
  onAdd?: (side: ChatPlaneSide) => void;
  onMove?: (id: string, index: number) => void;
};

const [ChatPlaneProvider, useChatPlaneContext] = createContext<ChatPlaneContextValue>('ChatPlane');

type ChatPlaneColumnContextValue = {
  value: string;
  current: boolean;
  columnRef: RefObject<HTMLDivElement | null>;
};

const [ChatPlaneColumnProvider, useChatPlaneColumnContext] =
  createContext<ChatPlaneColumnContextValue>('ChatPlane.Column');

type ChatPlaneItem = { id: string };

type ChatPlaneTileContextValue = Pick<MosaicTileProps<ChatPlaneItem>, 'data' | 'location' | 'draggable' | 'binding'>;

const [ChatPlaneTileProvider, useChatPlaneTileContext] = createContext<ChatPlaneTileContextValue>('ChatPlane.Tile');

type ChatPlaneColumnsContextValue = {
  renderColumn: (id: string) => ReactNode;
};

const [ChatPlaneColumnsProvider, useChatPlaneColumnsContext] =
  createContext<ChatPlaneColumnsContextValue>('ChatPlane.Columns');

//
// Root
//

type ChatPlaneRootProps = Util.ThemedClassName<
  PropsWithChildren<{
    /** The selected column. */
    value?: string;
    /** Scrolling a column to the center selects it, as do the arrow keys and a click. */
    onValueChange?: (value: string) => void;
    onAdd?: (side: ChatPlaneSide) => void;
    /** A column was dragged to `index` in the list of columns. */
    onMove?: (id: string, index: number) => void;
  }>
>;

/**
 * Columns of threads in a horizontal strip, with the selected column's prompt floating over the strip.
 * Goes inside a `Dnd.Root`, which the deck provides in the app.
 */
const ChatPlaneRoot = ({ classNames, value, onValueChange, onAdd, onMove, children }: ChatPlaneRootProps) => {
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  // Where a move we started is headed: adding a column re-snaps the strip, and that scroll must not select anything.
  const moveTargetRef = useRef<string | undefined>(undefined);
  const reportedRef = useRef(value);
  useEffect(() => {
    if (value !== reportedRef.current) {
      moveTargetRef.current = value;
      reportedRef.current = value;
    }
  }, [value]);

  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);
  const report = useCallback((id: string) => {
    reportedRef.current = id;
    onValueChangeRef.current?.(id);
  }, []);
  const select = useCallback(
    (id: string) => {
      // An unchanged selection scrolls nowhere, so nothing would ever clear the target.
      if (id !== reportedRef.current) {
        moveTargetRef.current = id;
      }
      report(id);
    },
    [report],
  );

  // A drag scrolls the strip under the pointer, and the column under the center at that moment means nothing.
  const dragging = !!useDndRootContext('ChatPlane.Root').dragging;
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;

  // On `scrollend` rather than `scroll`: selecting mid-flight would re-center on every column a long scroll passes.
  useEffect(() => {
    if (!viewport) {
      return;
    }
    const handleScrollEnd = () => {
      if (draggingRef.current) {
        return;
      }
      const { left, width } = viewport.getBoundingClientRect();
      const center = left + width / 2;
      const distanceFromCenter = (column: HTMLElement) => {
        const rect = column.getBoundingClientRect();
        return Math.abs(rect.left + rect.width / 2 - center);
      };
      const columns = Array.from(viewport.querySelectorAll<HTMLElement>(COLUMN_SELECTOR));
      const [nearest] = columns.toSorted((a, b) => distanceFromCenter(a) - distanceFromCenter(b));
      const id = nearest?.dataset.columnId;
      if (moveTargetRef.current) {
        if (id === moveTargetRef.current) {
          moveTargetRef.current = undefined;
        }
      } else if (id) {
        // A reader stepping between columns stays on the columns, on the one they scrolled to.
        if (document.activeElement?.matches(COLUMN_SELECTOR)) {
          nearest.focus({ preventScroll: true });
        }
        report(id);
      }
    };
    // The reader taking over abandons any move in flight.
    const handleTakeOver = () => {
      moveTargetRef.current = undefined;
    };
    const frame = viewport.parentElement;
    frame?.addEventListener('wheel', handleTakeOver, { passive: true });
    frame?.addEventListener('pointerdown', handleTakeOver);
    viewport.addEventListener('scrollend', handleScrollEnd);
    return () => {
      viewport.removeEventListener('scrollend', handleScrollEnd);
      frame?.removeEventListener('wheel', handleTakeOver);
      frame?.removeEventListener('pointerdown', handleTakeOver);
    };
  }, [viewport, report]);

  const navigation = useListNavigation({ mode: 'listbox', axis: 'horizontal' });
  const selection = useListSelection({
    mode: 'single',
    value,
    onValueChange: (id: string | undefined) => {
      if (id) {
        select(id);
      }
    },
  });

  return (
    <ChatPlaneProvider
      value={value}
      footer={footer}
      setFooter={setFooter}
      viewport={viewport}
      setViewport={setViewport}
      navigation={navigation}
      selection={selection}
      select={select}
      dragging={dragging}
      onAdd={onAdd}
      onMove={onMove}
    >
      <Panel.Root classNames={['[--chat-plane-width:32vw]', classNames]}>{children}</Panel.Root>
    </ChatPlaneProvider>
  );
};

ChatPlaneRoot.displayName = 'ChatPlane.Root';

//
// Viewport
//

type ChatPlaneViewportProps = PropsWithChildren;

/** The scrolling strip, and the footer the selected column's prompt floats in. */
const ChatPlaneViewport = ({ children }: ChatPlaneViewportProps) => {
  const { footer, setFooter, viewport, setViewport, selection, select, dragging, onMove } =
    useChatPlaneContext('ChatPlane.Viewport');
  const stripRef = useRef<HTMLDivElement>(null);

  // The dragged column stays on the strip's axis by taking only the pointer's x.
  const pointerXRef = useRef<number | undefined>(undefined);
  const updateDragPosition = useCallback(() => {
    const strip = stripRef.current;
    if (strip && pointerXRef.current !== undefined) {
      const x = pointerXRef.current - strip.getBoundingClientRect().left;
      strip.style.setProperty('--chat-plane-drag-x', `${x}px`);
    }
  }, []);
  // An autoscroll moves the strip under a still pointer, which reports nothing.
  useEffect(() => {
    if (!viewport || !dragging) {
      pointerXRef.current = undefined;
      return;
    }
    viewport.addEventListener('scroll', updateDragPosition, { passive: true });
    return () => viewport.removeEventListener('scroll', updateDragPosition);
  }, [viewport, dragging, updateDragPosition]);

  // The prompt grows with its text, so the columns track its height to end above it.
  useEffect(() => {
    if (!footer) {
      return;
    }
    const observer = new ResizeObserver(() => {
      stripRef.current?.style.setProperty('--chat-plane-footer-height', `${footer.offsetHeight}px`);
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [footer]);

  const containerId = useId();
  const activeLocationRef = useRef<DndLocation | undefined>(undefined);
  const eventHandler = useMemo<DndContainerHandler<ChatPlaneItem>>(
    () => ({
      id: containerId,
      canDrop: ({ source }) => source.containerId === containerId,
      onDrag: ({ position: { x } }) => {
        pointerXRef.current = x;
        updateDragPosition();
      },
      // The open gap rather than the drop target: a column is so wide that the pointer mostly rests on a neighboring
      // tile, whose location does not say which side of it the gap is on.
      onDrop: ({ source }) => {
        const location = activeLocationRef.current;
        if (typeof location === 'number') {
          onMove?.(source.id, Math.floor(location));
          select(source.id);
        }
      },
    }),
    [containerId, onMove, select, updateDragPosition],
  );
  const itemProps = useCallback((id: string) => selection.bind(id).rowProps, [selection]);

  return (
    <Panel.Body asChild>
      <Mosaic.Container
        asChild
        orientation='horizontal'
        autoScroll={viewport}
        eventHandler={eventHandler}
        itemProps={itemProps}
      >
        {/* The dragged column stops being a snap point, and the strip would jump to its neighbor under the pointer. */}
        <ScrollArea.Root orientation='horizontal' snap={!dragging} scrollbars={false}>
          <ScrollArea.Viewport ref={setViewport}>
            {/* Half the frame less half a column each side, so even the first and last column can reach the center. */}
            <div
              className='relative flex w-max h-full px-[calc(50cqw-var(--chat-plane-width)/2)] pt-2 pb-(--chat-plane-footer-height)'
              ref={stripRef}
            >
              <ChatPlaneActiveLocation locationRef={activeLocationRef} />
              {children}
            </div>
          </ScrollArea.Viewport>
          <div className='absolute inset-x-0 bottom-0 z-10 py-3 pointer-events-none' ref={setFooter} />
        </ScrollArea.Root>
      </Mosaic.Container>
    </Panel.Body>
  );
};

ChatPlaneViewport.displayName = 'ChatPlane.Viewport';

/** Lets the container's own drop handler, which sits above the container's context, read the open gap. */
const ChatPlaneActiveLocation = ({ locationRef }: { locationRef: RefObject<DndLocation | undefined> }) => {
  const { activeLocation } = useMosaicContainer('ChatPlane.ActiveLocation');
  locationRef.current = activeLocation;
  return null;
};

ChatPlaneActiveLocation.displayName = 'ChatPlane.ActiveLocation';

//
// Add
//

type ChatPlaneAddProps = {
  side: ChatPlaneSide;
};

/** Overflows a zero-width box into the strip's padding, since any width here would make a lone column scroll. */
const ChatPlaneAdd = ({ side }: ChatPlaneAddProps) => {
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);
  const { onAdd } = useChatPlaneContext('ChatPlane.Add');

  return (
    <div className={['flex items-center w-0', side === 'start' && 'justify-end'].filter(Boolean).join(' ')}>
      <Button.Root
        classNames={[
          'shrink-0 opacity-10 transition-opacity hover:opacity-100 focus-visible:opacity-100',
          side === 'start' ? 'me-2' : 'ms-2',
        ]}
        icon='ph--plus--regular'
        iconOnly
        showTooltip={false}
        size='xl'
        iconSize='xl'
        label={t('new-thread.button')}
        variant='ghost'
        data-testid={`chat-plane.add-${side}`}
        onClick={() => onAdd?.(side)}
      />
    </div>
  );
};

ChatPlaneAdd.displayName = 'ChatPlane.Add';

//
// Columns
//

type ChatPlaneColumnsProps = {
  items: readonly ChatPlaneItem[];
  /** Renders a `ChatPlane.Column`. */
  children: (id: string) => ReactNode;
};

const getItemId = ({ id }: ChatPlaneItem) => id;

/** Module-level since a stack remounts every tile when its `Tile` changes identity, which would end each session. */
const ChatPlaneStackTile: MosaicStackTileComponent<ChatPlaneItem> = ({ id, data, location, draggable, binding }) => {
  const { renderColumn } = useChatPlaneColumnsContext('ChatPlane.Tile');
  return (
    <ChatPlaneTileProvider data={data} location={location} draggable={draggable} binding={binding}>
      {renderColumn(id)}
    </ChatPlaneTileProvider>
  );
};

/** The arrow-key list; apart from the add buttons, which would otherwise be arrow-key stops. */
const ChatPlaneColumns = ({ items, children }: ChatPlaneColumnsProps) => {
  const { navigation } = useChatPlaneContext('ChatPlane.Columns');

  return (
    <ChatPlaneColumnsProvider renderColumn={children}>
      <Mosaic.Stack
        {...navigation.containerProps}
        orientation='horizontal'
        items={items}
        getId={getItemId}
        Tile={ChatPlaneStackTile}
        scrollIntoView={false}
        keepDragged
      />
    </ChatPlaneColumnsProvider>
  );
};

ChatPlaneColumns.displayName = 'ChatPlane.Columns';

//
// Column
//

type ChatPlaneColumnProps = PropsWithChildren<{
  /** Identifies the column to the selection. */
  value: string;
}>;

/**
 * A thread's place in the strip, holding its `ChatPlane.Cell` and `ChatPlane.Prompt`. Goes inside `Chat.Root`, whose
 * prompt it focuses.
 */
const ChatPlaneColumn = ({ value, children }: ChatPlaneColumnProps) => {
  const { event } = useChatContext('ChatPlane.Column');
  const { value: selected, dragging } = useChatPlaneContext('ChatPlane.Column');
  const current = value === selected;
  const columnRef = useRef<HTMLDivElement>(null);

  // Also once a drag ends: the column may have landed anywhere, and the drag may have scrolled the strip.
  useEffect(() => {
    if (current && !dragging) {
      columnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [current, dragging]);

  // Moving to a thread puts the cursor in its prompt, unless the reader stepped onto this column to keep moving.
  // Also once a drag ends, since a native drag takes focus from the prompt.
  useEffect(() => {
    if (current && !dragging && document.activeElement !== columnRef.current) {
      event.emit({ type: 'focus-prompt' });
    }
  }, [event, current, dragging]);

  return (
    <ChatPlaneColumnProvider value={value} current={current} columnRef={columnRef}>
      {children}
    </ChatPlaneColumnProvider>
  );
};

ChatPlaneColumn.displayName = 'ChatPlane.Column';

//
// Cell
//

type ChatPlaneCellProps = PropsWithChildren;

/**
 * The column's tile: a header with the drag handle, over the thread. Focusable as one unit. Escape from its thread or
 * prompt lands here, where the arrow keys move between columns and Enter goes back into the prompt.
 */
const ChatPlaneCell = ({ children }: ChatPlaneCellProps) => {
  const { t } = UiHooks.useTranslation(AssistantNamespace.key);
  const { event } = useChatContext('ChatPlane.Cell');
  const { navigation } = useChatPlaneContext('ChatPlane.Cell');
  const { value, current, columnRef } = useChatPlaneColumnContext('ChatPlane.Cell');
  const { data, location, draggable, binding } = useChatPlaneTileContext('ChatPlane.Cell');

  const handleKeyDown = useCallback(
    (keyEvent: KeyboardEvent<HTMLDivElement>) => {
      const { currentTarget, target, key } = keyEvent;
      if (target === currentTarget) {
        if (key === 'Enter') {
          keyEvent.preventDefault();
          event.emit({ type: 'focus-prompt' });
        }
        return;
      }
      // Inside the thread the arrow keys scroll it, so they must not reach the strip.
      keyEvent.stopPropagation();
      // Containment rather than bubbling: a popup opened from here takes its own Escape.
      if (key === 'Escape' && !keyEvent.defaultPrevented && target instanceof Node && currentTarget.contains(target)) {
        currentTarget.focus({ preventScroll: true });
      }
    },
    [event],
  );

  return (
    <Mosaic.Tile
      {...navigation.itemProps()}
      asChild
      classNames={[
        'w-(--chat-plane-width) snap-center dx-focus-group transition-opacity',
        !current && 'opacity-50',
        // Floats over the gap the stack reserves, centered on the pointer since the handle is centered.
        'data-[mosaic-tile-state=dragging]:absolute data-[mosaic-tile-state=dragging]:z-10',
        'data-[mosaic-tile-state=dragging]:h-auto',
        'data-[mosaic-tile-state=dragging]:top-2 data-[mosaic-tile-state=dragging]:bottom-(--chat-plane-footer-height)',
        'data-[mosaic-tile-state=dragging]:left-(--chat-plane-drag-x) data-[mosaic-tile-state=dragging]:-translate-x-1/2',
        'data-[mosaic-tile-state=dragging]:pointer-events-none data-[mosaic-tile-state=dragging]:opacity-100',
        'data-[mosaic-tile-state=dragging]:bg-base-surface data-[mosaic-tile-state=dragging]:shadow-lg',
      ]}
      id={value}
      data={data}
      location={location}
      draggable={draggable}
      nativeDragPreview={false}
      current={current}
      binding={binding}
      data-testid='chat-plane.column'
      data-column-id={value}
      ref={columnRef}
    >
      <Panel.Root asChild>
        <div onKeyDown={handleKeyDown}>
          <Panel.Header classNames='justify-center'>
            <Mosaic.DragHandle
              icon='ph--dots-six--regular'
              label={t('move-thread.button')}
              testId='chat-plane.drag-handle'
            />
          </Panel.Header>
          {children}
        </div>
      </Panel.Root>
    </Mosaic.Tile>
  );
};

ChatPlaneCell.displayName = 'ChatPlane.Cell';

//
// Prompt
//

type ChatPlanePromptProps = PropsWithChildren;

/**
 * Renders into the footer, and stays mounted but hidden unless its column is selected, so a draft survives moving away.
 */
const ChatPlanePrompt = ({ children }: ChatPlanePromptProps) => {
  const { footer } = useChatPlaneContext('ChatPlane.Prompt');
  const { current, columnRef } = useChatPlaneColumnContext('ChatPlane.Prompt');

  // React bubbles through the portal, and the strip would take Tab and focus from the prompt as its own.
  const handleKeyDown = useCallback(
    (keyEvent: KeyboardEvent<HTMLDivElement>) => {
      keyEvent.stopPropagation();
      const { currentTarget, target, key } = keyEvent;
      if (key === 'Escape' && !keyEvent.defaultPrevented && target instanceof Node && currentTarget.contains(target)) {
        columnRef.current?.focus({ preventScroll: true });
      }
    },
    [columnRef],
  );
  const handleFocus = useCallback((focusEvent: FocusEvent<HTMLDivElement>) => focusEvent.stopPropagation(), []);

  return footer
    ? createPortal(
        <div
          className={current ? 'flex flex-col gap-1 w-(--chat-plane-width) mx-auto pointer-events-auto' : 'hidden'}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>,
        footer,
      )
    : null;
};

ChatPlanePrompt.displayName = 'ChatPlane.Prompt';

//
// Exports
//

export {
  ChatPlaneAdd as Add,
  ChatPlaneCell as Cell,
  ChatPlaneColumn as Column,
  ChatPlaneColumns as Columns,
  ChatPlanePrompt as Prompt,
  ChatPlaneRoot as Root,
  ChatPlaneViewport as Viewport,
};

export type {
  ChatPlaneAddProps as AddProps,
  ChatPlaneCellProps as CellProps,
  ChatPlaneColumnProps as ColumnProps,
  ChatPlaneColumnsProps as ColumnsProps,
  ChatPlanePromptProps as PromptProps,
  ChatPlaneRootProps as RootProps,
  ChatPlaneSide as Side,
  ChatPlaneViewportProps as ViewportProps,
};
