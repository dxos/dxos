//
// Copyright 2025 DXOS.org
//

import { type KeyEvent, type ScrollBoxRenderable } from '@opentui/core';
import { useKeyboard } from '@opentui/solid';
import { For, createEffect, createSignal, useContext } from 'solid-js';

import { type Theme } from '../theme';

import { AppContext } from './App';

export type Column<T> = {
  header: string;
  width: number; // Width characters.
  render: (row: T) => string;
};

export type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedId?: string; // Assume data has 'id' property or we might need a getter.
  getId?: (row: T) => string;
  showHeader?: boolean;
  disableKeyboard?: boolean; // If true, don't handle keyboard events (parent will handle them).
  theme?: Theme;
};

export const Table = <T,>(props: TableProps<T>) => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const getId = props.getId ?? ((row: any) => row.id);
  const context = useContext(AppContext);

  // Refs and measurement state - use signal for ref so effects can track it reactively.
  const [scrollboxRef, setScrollboxRef] = createSignal<ScrollBoxRenderable | undefined>();
  const [scrollboxHeight, setScrollboxHeight] = createSignal<number>(0);
  const [rowHeight] = createSignal<number>(1); // Each table row is 1 terminal line.

  // Set up effects.
  const focused = isFocused(context);
  useSelectionSync(props, selectedIndex, setSelectedIndex, getId);
  useScrollboxHeight(scrollboxRef, setScrollboxHeight);
  useScrollboxFocus(scrollboxRef, focused);
  useScrollToSelection(scrollboxRef, props, selectedIndex, scrollboxHeight, rowHeight);

  // Handle keyboard events for navigation and selection.
  useKeyboard((key: KeyEvent) => {
    if (props.disableKeyboard) {
      return;
    }

    // Only handle keyboard events when scrollbox is focused.
    const ref = scrollboxRef();
    if (!ref || !ref.focused) {
      return;
    }

    const data = props.data;
    if (data.length === 0) {
      return;
    }

    const currentIndex = selectedIndex();
    let newIndex = currentIndex;

    // Use vim-style navigation: 'k' for up, 'j' for down.
    // Prevent scrollbox from handling these keys.
    if (key.name === 'k') {
      key.preventDefault();
      newIndex = Math.max(0, currentIndex - 1);
    } else if (key.name === 'j') {
      key.preventDefault();
      newIndex = Math.min(data.length - 1, currentIndex + 1);
    } else if (key.name === 'return' || key.name === 'enter') {
      const row = data[currentIndex];
      if (row) {
        props.onRowClick?.(row);
      }
      return;
    } else {
      return;
    }

    // Only update if index actually changed.
    if (newIndex !== currentIndex) {
      setSelectedIndex(newIndex);
      const row = data[newIndex];
      if (row) {
        props.onRowClick?.(row);
      }
    }
  });

  return (
    <box flexDirection='column' flexGrow={1} height='100%'>
      {/* Header */}
      {props.showHeader !== false && (
        <box flexDirection='column'>
          <box flexDirection='row' height={1}>
            <For each={props.columns}>
              {(col) => (
                <box width={col.width}>
                  <text style={props.theme ? { fg: props.theme.text.bold } : undefined}>{col.header}</text>
                </box>
              )}
            </For>
          </box>
          <box
            border={['bottom']}
            borderColor={props.theme ? (focused() ? props.theme.accent : props.theme.text.subdued) : undefined}
            height={1}
            width='100%'
          />
        </box>
      )}

      {/* Spacer to prevent scrollbar from intersecting header separator */}
      {props.showHeader !== false && <box height={1} />}

      {/* Scrollable rows */}
      <box flexGrow={1} paddingTop={props.showHeader !== false ? 1 : 0}>
        <scrollbox
          ref={setScrollboxRef}
          flexGrow={1}
          scrollX={false}
          scrollY={true}
          focused={focused()}
          onSizeChange={() => {
            const ref = scrollboxRef();
            if (ref) {
              const scrollboxH = ref.height;
              const viewportH = ref.viewport?.height ?? 0;
              const height = viewportH > 0 ? viewportH : scrollboxH;
              if (height > 0) {
                setScrollboxHeight(height);
              }
            }
          }}
        >
        <box flexDirection='column'>
          <For each={props.data}>
            {(row) => {
              const getId = props.getId ?? ((row: any) => row.id);
              const isSelected = () => getId(row) === props.selectedId;

              return (
                <box flexDirection='row' backgroundColor={isSelected() && props.theme ? props.theme.input.bg : undefined}>
                  <For each={props.columns}>
                    {(col) => (
                      <box width={col.width}>
                        <text
                          style={{
                            fg: props.theme ? (isSelected() ? props.theme.text.primary : props.theme.text.default) : undefined,
                          }}
                        >
                          {col.render(row)}
                        </text>
                      </box>
                    )}
                  </For>
                </box>
              );
            }}
          </For>
        </box>
        </scrollbox>
      </box>
    </box>
  );
};

// Helper: Calculate scroll position to keep selected row visible.
const calculateScrollPosition = (
  selectedIndex: number,
  scrollboxHeight: number,
  rowHeight: number,
  currentScrollTop: number,
  totalRows: number,
): number => {
  if (totalRows === 0 || scrollboxHeight === 0) {
    return currentScrollTop;
  }

  const visibleRows = Math.floor(scrollboxHeight / rowHeight);
  const targetRowPosition = selectedIndex * rowHeight;
  const viewportTop = currentScrollTop;
  const viewportBottom = viewportTop + visibleRows;

  // If row is above viewport, align to top.
  if (targetRowPosition < viewportTop) {
    return targetRowPosition;
  }

  // If row is below viewport, align to bottom.
  if (targetRowPosition >= viewportBottom) {
    return targetRowPosition - scrollboxHeight + rowHeight;
  }

  // Row is within viewport, no change needed.
  return currentScrollTop;
};

// Helper: Determine if table should be focused based on App context.
const isFocused = (context: { focus: () => string | undefined } | undefined): (() => boolean) => {
  return () => context?.focus?.() === 'table';
};

// Effect: Sync selection with props if provided, or auto-select first item.
const useSelectionSync = <T,>(
  props: TableProps<T>,
  selectedIndex: () => number,
  setSelectedIndex: (index: number) => void,
  getId: (row: T) => string,
) => {
  createEffect(() => {
    if (props.selectedId) {
      const index = props.data.findIndex((row) => getId(row) === props.selectedId);
      if (index >= 0) {
        setSelectedIndex(index);
      }
    } else if (props.data.length > 0 && !props.selectedId) {
      // If no selectedId is provided, ensure first item is selected.
      if (selectedIndex() === 0) {
        const firstRow = props.data[0];
        if (firstRow && getId(firstRow) !== props.selectedId) {
          props.onRowClick?.(firstRow);
        }
      }
    }
  });
};

// Effect: Measure scrollbox viewport height.
const useScrollboxHeight = (
  scrollboxRef: () => ScrollBoxRenderable | undefined,
  setScrollboxHeight: (height: number) => void,
) => {
  createEffect(() => {
    const ref = scrollboxRef();
    if (ref) {
      // Try both scrollbox height and viewport height.
      const scrollboxH = ref.height;
      const viewportH = ref.viewport?.height ?? 0;
      const height = viewportH > 0 ? viewportH : scrollboxH;
      setScrollboxHeight(height);
    }
  });
};

// Effect: Focus/blur scrollbox based on App focus state.
const useScrollboxFocus = (scrollboxRef: () => ScrollBoxRenderable | undefined, isFocused: () => boolean) => {
  createEffect(() => {
    const ref = scrollboxRef();
    if (!ref) {
      return;
    }

    const focused = isFocused();
    const scrollboxIsFocused = ref.focused;

    if (focused && !scrollboxIsFocused) {
      ref.focus();
    } else if (!focused && scrollboxIsFocused) {
      ref.blur();
    }
  });
};

// Effect: Apply scroll position when selection changes.
const useScrollToSelection = <T,>(
  scrollboxRef: () => ScrollBoxRenderable | undefined,
  props: TableProps<T>,
  selectedIndex: () => number,
  scrollboxHeight: () => number,
  rowHeight: () => number,
) => {
  createEffect(() => {
    const ref = scrollboxRef();
    if (!ref || props.data.length === 0) {
      return;
    }

    const currentSelectedIndex = selectedIndex();
    const height = scrollboxHeight();
    const rowH = rowHeight();
    const currentScrollTop = ref.scrollTop;
    const totalRows = props.data.length;

    // Clamp selected index to valid range.
    const clampedIndex = Math.max(0, Math.min(currentSelectedIndex, totalRows - 1));
    const newScrollTop = calculateScrollPosition(clampedIndex, height, rowH, currentScrollTop, totalRows);

    // Clamp scroll position to valid range.
    const maxScrollTop = Math.max(0, totalRows * rowH - height);
    const clampedScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));

    if (clampedScrollTop !== currentScrollTop) {
      ref.scrollTop = clampedScrollTop;
    }
  });
};
