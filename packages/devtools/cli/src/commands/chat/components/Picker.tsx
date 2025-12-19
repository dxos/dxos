//
// Copyright 2025 DXOS.org
//

import { type KeyEvent } from '@opentui/core';
import { useKeyboard } from '@opentui/solid';
import { For, Show, createEffect, createSignal } from 'solid-js';

import { theme } from '../../../theme';

export type PickerItem = {
  id: string;
  label: string;
};

export type PickerProps = {
  items: PickerItem[];
  selected?: string[];
  multi?: boolean;
  title?: string;
  onSave?: (ids: string[]) => void;
  onCancel?: () => void;
};

export const Picker = (props: PickerProps) => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set(props.selected));

  // Reset selection when items change.
  createEffect(() => {
    props.items;
    setSelectedIndex(0);
    setSelectedIds(new Set(props.selected));
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
          props.onSave?.(Array.from(selectedIds()));
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
            <text
              style={{
                bg: i() === selectedIndex() ? theme.input.bg : undefined,
                fg: i() === selectedIndex() ? theme.text.bold : theme.text.default,
              }}
            >
              {props.multi ? (selectedIds().has(item.id) ? '[x] ' : '[ ] ') : ''}
              {item.label}
            </text>
          </box>
        )}
      </For>
    </box>
  );
};
