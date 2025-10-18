//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type MaybePromise } from '@dxos/util';

import { type PlaceholderOptions } from '../command-dialog';

import { commandMenu, commandRangeEffect } from './command-menu';
import { type MenuGroup, type MenuItem } from './menu';
import { type MenuProviderProps } from './MenuProvider';
import { getMenuItem, getNextMenuItem, getPreviousMenuItem } from './util';

export type UseCommandMenuOptions = {
  // TODO(burdon): Extensions should not depend directly on the editor view.
  //  Instead this should be encapsulted entirely in the extension.
  viewRef: RefObject<EditorView | null>;
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;
  getMenu: (trigger: string, query?: string) => MaybePromise<MenuGroup[]>;
};

export type UseCommandMenu = {
  groupsRef: RefObject<MenuGroup[]>;
  extension: Extension;
} & Pick<MenuProviderProps, 'currentItem' | 'open' | 'onActivate' | 'onOpenChange' | 'onSelect'>;

export const useCommandMenu = ({ viewRef, trigger, placeholder, getMenu }: UseCommandMenuOptions): UseCommandMenu => {
  const currentRef = useRef<MenuItem | null>(null);
  const groupsRef = useRef<MenuGroup[]>([]);
  const [currentItem, setCurrentItem] = useState<string>();
  const [open, setOpen] = useState(false);
  const [_, refresh] = useState({});

  const handleOpenChange = useCallback<NonNullable<UseCommandMenu['onOpenChange']>>(
    async (open, trigger?) => {
      if (open && trigger) {
        groupsRef.current = await getMenu(trigger);
      }

      setOpen(open);
      if (!open) {
        setCurrentItem(undefined);
        viewRef.current?.dispatch({ effects: [commandRangeEffect.of(null)] }); // TODO(burdon): Move into extension.
      }
    },
    [getMenu],
  );

  const handleActivate = useCallback<NonNullable<UseCommandMenu['onActivate']>>(
    async (event) => {
      const item = getMenuItem(groupsRef.current, currentItem);
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

  const handleSelect = useCallback<NonNullable<UseCommandMenu['onSelect']>>((item) => {
    if (!viewRef.current) {
      return;
    }

    const selection = viewRef.current.state.selection.main;
    void item.onSelect?.(viewRef.current, selection.head);
  }, []);

  const serializedTrigger = Array.isArray(trigger) ? trigger.join(',') : trigger;

  const extension = useMemo<Extension>(() => {
    return commandMenu({
      trigger,
      placeholder,
      onClose: () => handleOpenChange(false),
      onArrowDown: () => {
        setCurrentItem((currentItem) => {
          const next = getNextMenuItem(groupsRef.current, currentItem);
          currentRef.current = next;
          return next.id;
        });
      },
      onArrowUp: () => {
        setCurrentItem((currentItem) => {
          const previous = getPreviousMenuItem(groupsRef.current, currentItem);
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
    extension,
    currentItem,
    open,
    onOpenChange: setOpen,
    onActivate: handleActivate,
    onSelect: handleSelect,
  };
};
