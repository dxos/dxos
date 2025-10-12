//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type DxAnchorActivate } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

import { type CommandMenuGroup, type CommandMenuItem, getItem, getNextItem, getPreviousItem } from '../../components';

import { commandMenu, commandRangeEffect } from './command-menu';
import { type PlaceholderOptions } from './placeholder';

export type UseCommandMenuOptions = {
  // TODO(burdon): Extensions should not depend directly on the editor view.
  viewRef: RefObject<EditorView | null>;
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;
  getMenu: (trigger: string, query?: string) => MaybePromise<CommandMenuGroup[]>;
};

export type UseCommandMenu = {
  groupsRef: RefObject<CommandMenuGroup[]>;
  commandMenu: Extension;
  currentItem: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate: (event: DxAnchorActivate) => void;
  onSelect: (item: CommandMenuItem) => void;
};

export const useCommandMenu = ({ viewRef, trigger, placeholder, getMenu }: UseCommandMenuOptions): UseCommandMenu => {
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
        setCurrentItem(undefined);
        viewRef.current?.dispatch({ effects: [commandRangeEffect.of(null)] });
      }
    },
    [getMenu],
  );

  const handleActivate = useCallback<UseCommandMenu['onActivate']>(
    async (event) => {
      const item = getItem(groupsRef.current, currentItem);
      if (item) {
        currentRef.current = item;
      }

      const triggerKey = event.trigger.getAttribute('data-trigger');
      if (!open && triggerKey) {
        await handleOpenChange(true, triggerKey);
      }
    },
    [open, handleOpenChange],
  );

  // TODO(burdon): Move outside.
  const handleSelect = useCallback<UseCommandMenu['onSelect']>((item) => {
    if (!viewRef.current) {
      return;
    }

    const selection = viewRef.current.state.selection.main;
    void item.onSelect?.(viewRef.current, selection.head);
  }, []);

  const serializedTrigger = Array.isArray(trigger) ? trigger.join(',') : trigger;

  const memoizedCommandMenu = useMemo<Extension>(() => {
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
        if (/\W/.test(text)) {
          return queueMicrotask(() => handleOpenChange(false));
        }

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
    groupsRef,
    commandMenu: memoizedCommandMenu,
    currentItem,
    open,
    onOpenChange: setOpen,
    onActivate: handleActivate,
    onSelect: handleSelect,
  };
};
