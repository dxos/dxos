//
// Copyright 2025 DXOS.org
//

import { type KeyEvent } from '@opentui/core';
import { useKeyboard } from '@opentui/solid';
import { createEffect, createSignal, For, Show } from 'solid-js';

import { theme } from '../theme';

export type PickerItem = {
  id: string;
  label: string;
};

export type PickerProps = {
  items: PickerItem[];
  onSelect?: (id: string) => void;
  onConfirm?: (ids: string[]) => void;
  onCancel?: () => void;
  defaultSelected?: string[];
  title?: string;
  multi?: boolean;
};

export const Picker = (props: PickerProps) => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set(props.defaultSelected));

  // Reset selection when items change.
  createEffect(() => {
    props.items;
    setSelectedIndex(0);
    setSelectedIds(new Set(props.defaultSelected));
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
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
          toggleSelection(props.items[selectedIndex()].id);
        }
        break;
      }

      case 'return': {
        if (props.multi) {
          props.onConfirm?.(Array.from(selectedIds()));
        } else {
          props.onSelect?.(props.items[selectedIndex()].id);
        }
        break;
      }

      case 'escape': {
        props.onCancel?.();
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
          <box height={1} backgroundColor={i() === selectedIndex() ? theme.input.bg : undefined}>
            <text style={{ bg: i() === selectedIndex() ? theme.input.bg : undefined }}>
              {props.multi ? (selectedIds().has(item.id) ? '[x] ' : '[ ] ') : ''}
              {item.label}
            </text>
          </box>
        )}
      </For>
    </box>
  );
};
