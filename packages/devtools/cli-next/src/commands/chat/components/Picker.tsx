//
// Copyright 2025 DXOS.org
//

import { type KeyEvent } from '@opentui/core';
import { useKeyboard } from '@opentui/solid';
import { createEffect, createSignal, For, Show } from 'solid-js';

import { theme } from '../theme';

export type PickerProps<T> = {
  items: T[];
  onSelect: (item: T) => void;
  onConfirm?: (items: T[]) => void;
  onCancel: () => void;
  renderItem?: (item: T) => string;
  defaultSelected?: T[];
  title?: string;
  multi?: boolean;
};

export const Picker = <T extends any>(props: PickerProps<T>) => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [selectedItems, setSelectedItems] = createSignal<Set<T>>(new Set(props.defaultSelected));

  // Reset selection when items change.
  createEffect(() => {
    props.items;
    setSelectedIndex(0);
    setSelectedItems(new Set(props.defaultSelected));
  });

  const toggleSelection = (item: T) => {
    const newSet = new Set(selectedItems());
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setSelectedItems(newSet);
  };

  useKeyboard((event: KeyEvent) => {
    switch (event.name) {
      case 'up': {
        setSelectedIndex((idx) => (idx > 0 ? idx - 1 : idx));
        break;
      }

      case 'down': {
        setSelectedIndex((idx) => (idx < props.items.length - 1 ? idx + 1 : idx));
        break;
      }

      case 'space': {
        if (props.multi) {
          toggleSelection(props.items[selectedIndex()]);
        }
        break;
      }

      case 'return': {
        if (props.multi) {
          props.onConfirm?.(Array.from(selectedItems()));
        } else {
          props.onSelect(props.items[selectedIndex()]);
        }
        break;
      }

      case 'escape': {
        props.onCancel();
        break;
      }
    }
  });

  return (
    <box
      flexDirection='column'
      borderStyle='double'
      borderColor={theme.accent}
      paddingLeft={1}
      paddingRight={1}
      width={40}
    >
      <Show when={props.title}>
        <box paddingBottom={1}>
          <text style={{ fg: theme.text.bold }}>{props.title}</text>
        </box>
      </Show>
      <For each={props.items}>
        {(item, i) => (
          <box height={1} backgroundColor={i() === selectedIndex() ? theme.accent : undefined}>
            <text style={{ fg: i() === selectedIndex() ? theme.bg : undefined }}>
              {props.multi ? (selectedItems().has(item) ? '[x] ' : '[ ] ') : ''}
              {props.renderItem ? props.renderItem(item) : String(item)}
            </text>
          </box>
        )}
      </For>
    </box>
  );
};
