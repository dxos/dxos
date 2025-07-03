//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { type MaybePromise } from '@dxos/util';

import { commandMenu, commandRangeEffect } from './command-menu';
import { type PlaceholderOptions } from './placeholder';
import { getItem, getNextItem, getPreviousItem, type CommandMenuGroup, type CommandMenuItem } from '../../components';

export type UseCommandMenuOptions = {
  viewRef: RefObject<EditorView | undefined>;
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;
  getMenu: (trigger: string, query?: string) => MaybePromise<CommandMenuGroup[]>;
};

export const useCommandMenu = ({ viewRef, trigger, placeholder, getMenu }: UseCommandMenuOptions) => {
  const triggerRef = useRef<DxRefTag | null>(null);
  const currentRef = useRef<CommandMenuItem | null>(null);
  const groupsRef = useRef<CommandMenuGroup[]>([]);
  const [currentItem, setCurrentItem] = useState<string>();
  const [open, setOpen] = useState(false);
  const [_, refresh] = useState({});

  const handleOpenChange = useCallback(
    async (open: boolean, trigger?: string) => {
      if (open && trigger) {
        groupsRef.current = await getMenu(trigger);
      }
      setOpen(open);
      if (!open) {
        triggerRef.current = null;
        setCurrentItem(undefined);
        viewRef.current?.dispatch({ effects: [commandRangeEffect.of(null)] });
      }
    },
    [getMenu],
  );

  const handleActivate = useCallback(
    async (event: DxRefTagActivate) => {
      const item = getItem(groupsRef.current, currentItem);
      if (item) {
        currentRef.current = item;
      }

      triggerRef.current = event.trigger;
      const triggerKey = event.trigger.getAttribute('data-trigger');
      if (!open && triggerKey) {
        await handleOpenChange(true, triggerKey);
      }
    },
    [open, handleOpenChange],
  );

  const handleSelect = useCallback((item: CommandMenuItem) => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const selection = view.state.selection.main;
    void item.onSelect?.(view, selection.head);
  }, []);

  const serializedTrigger = Array.isArray(trigger) ? trigger.join(',') : trigger;
  const _commandMenu = useMemo(() => {
    return commandMenu({
      trigger,
      placeholder,
      onClose: () => handleOpenChange(false),
      onArrowDown: () => {
        setCurrentItem((currentItem) => {
          const next = getNextItem(groupsRef.current, currentItem);
          currentRef.current = next;
          return next.id;
        });
      },
      onArrowUp: () => {
        setCurrentItem((currentItem) => {
          const previous = getPreviousItem(groupsRef.current, currentItem);
          currentRef.current = previous;
          return previous.id;
        });
      },
      onEnter: () => {
        if (currentRef.current) {
          handleSelect(currentRef.current);
        }
      },
      onTextChange: async (trigger, text) => {
        groupsRef.current = await getMenu(trigger, text);
        const firstItem = groupsRef.current.filter((group) => group.items.length > 0)[0]?.items[0];
        if (firstItem) {
          setCurrentItem(firstItem.id);
          currentRef.current = firstItem;
        }
        refresh({});
      },
    });
  }, [handleOpenChange, getMenu, serializedTrigger, placeholder]);

  return {
    commandMenu: _commandMenu,
    currentItem,
    groupsRef,
    ref: triggerRef,
    open,
    onActivate: handleActivate,
    onOpenChange: setOpen,
    onSelect: handleSelect,
  };
};
