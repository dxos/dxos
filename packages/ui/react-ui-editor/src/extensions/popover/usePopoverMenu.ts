//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type MaybePromise } from '@dxos/util';

import { type PlaceholderOptions } from '../autocomplete';

import { type PopoverMenuGroup, type PopoverMenuItem } from './menu';
import { modalStateEffect } from './modal';
import { popover, popoverRangeEffect, popoverStateField } from './popover';
import { type PopoverMenuProviderProps } from './PopoverMenuProvider';
import { getMenuItem, getNextMenuItem, getPreviousMenuItem } from './util';

export type UsePopoverMenuProps = {
  viewRef: RefObject<EditorView | null>;
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;
  getMenu: (trigger: string, query?: string) => MaybePromise<PopoverMenuGroup[]>;
};

export type UsePopoverMenu = {
  groupsRef: RefObject<PopoverMenuGroup[]>;
  extension: Extension;
} & Pick<PopoverMenuProviderProps, 'currentItem' | 'open' | 'onOpenChange' | 'onActivate' | 'onSelect' | 'onCancel'>;

export const usePopoverMenu = ({ viewRef, trigger, placeholder, getMenu }: UsePopoverMenuProps): UsePopoverMenu => {
  const groupsRef = useRef<PopoverMenuGroup[]>([]);
  const currentRef = useRef<PopoverMenuItem | null>(null);
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
        viewRef.current?.dispatch({
          effects: [popoverRangeEffect.of(null)],
        });
      }

      // TODO(burdon): Possible race condition.
      //  useTextEditor.handleKeyDown will get called after this handler completes.
      requestAnimationFrame(() => {
        viewRef.current?.dispatch({
          effects: [modalStateEffect.of(open)],
        });
      });
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
        handleOpenChange(true, triggerKey);
      }
    },
    [open, handleOpenChange],
  );

  const handleSelect = useCallback<NonNullable<UsePopoverMenu['onSelect']>>((item) => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    void item.onSelect?.(view, view.state.selection.main.head);
  }, []);

  const handleCancel = useCallback<NonNullable<UsePopoverMenu['onCancel']>>(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    // Delete trigger.
    const range = view.state.field(popoverStateField)?.range;
    if (range) {
      view.dispatch({
        changes: { ...range, insert: '' },
      });
    }
  }, []);

  const serializedTrigger = Array.isArray(trigger) ? trigger.join(',') : trigger;
  const extension = useMemo<Extension>(() => {
    return popover({
      trigger,
      placeholder,
      onClose: () => handleOpenChange(false),
      onArrowUp: () => {
        setCurrentItem((currentItem) => {
          const previous = getPreviousMenuItem(groupsRef.current, currentItem);
          currentRef.current = previous;
          return previous.id;
        });
      },
      onArrowDown: () => {
        setCurrentItem((currentItem) => {
          const next = getNextMenuItem(groupsRef.current, currentItem);
          currentRef.current = next;
          return next.id;
        });
      },
      onEnter: () => {
        if (currentRef.current) {
          handleSelect(currentRef.current);
        }
      },
      onTextChange: async (trigger, text) => {
        if (/\W/.test(text)) {
          return requestAnimationFrame(() => handleOpenChange(false));
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
    onCancel: handleCancel,
  };
};
