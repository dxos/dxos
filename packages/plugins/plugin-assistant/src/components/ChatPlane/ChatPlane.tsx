//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, {
  type FocusEvent,
  type KeyboardEvent,
  type PropsWithChildren,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { createContext } from '@dxos/react-hooks';
import {
  type UseListNavigationReturn,
  type UseListSelectionReturn,
  useListNavigation,
  useListSelection,
} from '@dxos/react-ui-list';
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
  setViewport: (viewport: HTMLDivElement | null) => void;
  navigation: UseListNavigationReturn;
  selection: UseListSelectionReturn;
  onAdd?: (side: ChatPlaneSide) => void;
};

const [ChatPlaneProvider, useChatPlaneContext] = createContext<ChatPlaneContextValue>('ChatPlane');

type ChatPlaneColumnContextValue = {
  current: boolean;
  columnRef: RefObject<HTMLDivElement | null>;
};

const [ChatPlaneColumnProvider, useChatPlaneColumnContext] =
  createContext<ChatPlaneColumnContextValue>('ChatPlane.Column');

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
  }>
>;

/**
 * Columns of threads in a horizontal strip, with the selected column's prompt floating over the strip.
 */
const ChatPlaneRoot = ({ classNames, value, onValueChange, onAdd, children }: ChatPlaneRootProps) => {
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

  // On `scrollend` rather than `scroll`: selecting mid-flight would re-center on every column a long scroll passes.
  useEffect(() => {
    if (!viewport) {
      return;
    }
    const handleScrollEnd = () => {
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
        moveTargetRef.current = id;
        report(id);
      }
    },
  });

  return (
    <ChatPlaneProvider
      value={value}
      footer={footer}
      setFooter={setFooter}
      setViewport={setViewport}
      navigation={navigation}
      selection={selection}
      onAdd={onAdd}
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
  const { footer, setFooter, setViewport } = useChatPlaneContext('ChatPlane.Viewport');

  // The prompt grows with its text, so the columns track its height to end above it.
  const stripRef = useRef<HTMLDivElement>(null);
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

  return (
    <Panel.Body asChild>
      <ScrollArea.Root orientation='horizontal' snap scrollbars={false}>
        <ScrollArea.Viewport ref={setViewport}>
          {/* Half the frame less half a column each side, so even the first and last column can reach the center. */}
          <div
            className='flex w-max h-full px-[calc(50cqw-var(--chat-plane-width)/2)] pb-(--chat-plane-footer-height)'
            ref={stripRef}
          >
            {children}
          </div>
        </ScrollArea.Viewport>
        <div className='absolute inset-x-0 bottom-0 z-10 py-3 pointer-events-none' ref={setFooter} />
      </ScrollArea.Root>
    </Panel.Body>
  );
};

ChatPlaneViewport.displayName = 'ChatPlane.Viewport';

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

type ChatPlaneColumnsProps = PropsWithChildren;

/** The arrow-key list; apart from the add buttons, which would otherwise be arrow-key stops. */
const ChatPlaneColumns = ({ children }: ChatPlaneColumnsProps) => {
  const { navigation } = useChatPlaneContext('ChatPlane.Columns');

  return (
    <div {...navigation.containerProps} className='flex h-full'>
      {children}
    </div>
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
 * A column, focusable as one unit. Escape from its thread or prompt lands here, where the arrow keys move between
 * columns and Enter goes back into the prompt. Goes inside `Chat.Root`, whose prompt it focuses.
 */
const ChatPlaneColumn = ({ value, children }: ChatPlaneColumnProps) => {
  const { event } = useChatContext('ChatPlane.Column');
  const { value: selected, navigation, selection } = useChatPlaneContext('ChatPlane.Column');
  const current = value === selected;
  const columnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (current) {
      columnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [current]);

  // Moving to a thread puts the cursor in its prompt, unless the reader stepped onto this column to keep moving.
  useEffect(() => {
    if (current && document.activeElement !== columnRef.current) {
      event.emit({ type: 'focus-prompt' });
    }
  }, [event, current]);

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
    <ChatPlaneColumnProvider current={current} columnRef={columnRef}>
      <Panel.Root
        classNames={['w-(--chat-plane-width) snap-center dx-focus-group transition-opacity', !current && 'opacity-50']}
        asChild
      >
        <div
          {...navigation.itemProps()}
          {...selection.bind(value).rowProps}
          data-testid='chat-plane.column'
          data-column-id={value}
          aria-current={current ? 'true' : undefined}
          onKeyDown={handleKeyDown}
          ref={columnRef}
        >
          {children}
        </div>
      </Panel.Root>
    </ChatPlaneColumnProvider>
  );
};

ChatPlaneColumn.displayName = 'ChatPlane.Column';

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
  ChatPlaneColumn as Column,
  ChatPlaneColumns as Columns,
  ChatPlanePrompt as Prompt,
  ChatPlaneRoot as Root,
  ChatPlaneViewport as Viewport,
};

export type {
  ChatPlaneAddProps as AddProps,
  ChatPlaneColumnProps as ColumnProps,
  ChatPlaneColumnsProps as ColumnsProps,
  ChatPlanePromptProps as PromptProps,
  ChatPlaneRootProps as RootProps,
  ChatPlaneSide as Side,
  ChatPlaneViewportProps as ViewportProps,
};
