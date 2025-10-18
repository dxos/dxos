//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type MaybePromise } from '@dxos/util';

import { type PlaceholderOptions } from '../command-dialog';

import { popoverMenu, commandRangeEffect } from './popover-menu';
import { type PopoverMenuGroup, type PopoverMenuItem } from './menu';
import { type PopoverMenuProviderProps } from './PopoverMenuProvider';
import { getMenuItem, getNextMenuItem, getPreviousMenuItem } from './util';

export type UsePopoverMenuOptions = {
  // TODO(burdon): Extensions should not depend directly on the editor view.
  //  Instead this should be encapsulted entirely in the extension.
  viewRef: RefObject<EditorView | null>;
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;
  getMenu: (trigger: string, query?: string) => MaybePromise<PopoverMenuGroup[]>;
};

export type UsePopoverMenu = {
  groupsRef: RefObject<PopoverMenuGroup[]>;
  extension: Extension;
} & Pick<PopoverMenuProviderProps, 'currentItem' | 'open' | 'onActivate' | 'onOpenChange' | 'onSelect'>;

export const usePopoverMenu = ({ viewRef, trigger, placeholder, getMenu }: UsePopoverMenuOptions): UsePopoverMenu => {
  const currentRef = useRef<PopoverMenuItem | null>(null);
  const groupsRef = useRef<PopoverMenuGroup[]>([]);
  const [currentItem, setCurrentItem] = useState<string>();
  const [open, setOpen] = useState(false);
  const [_, refresh] = useState({});

  const handleOpenChange = useCallback<NonNullable<UsePopoverMenu['onOpenChange']>>(
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

  const handleActivate = useCallback<NonNullable<UsePopoverMenu['onActivate']>>(
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

  const handleSelect = useCallback<NonNullable<UsePopoverMenu['onSelect']>>((item) => {
    if (!viewRef.current) {
      return;
    }

    const selection = viewRef.current.state.selection.main;
    void item.onSelect?.(viewRef.current, selection.head);
  }, []);

  const serializedTrigger = Array.isArray(trigger) ? trigger.join(',') : trigger;

  const extension = useMemo<Extension>(() => {
    return popoverMenu({
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
