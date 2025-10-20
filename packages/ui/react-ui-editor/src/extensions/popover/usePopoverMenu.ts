//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type MaybePromise } from '@dxos/util';

import { type PopoverMenuGroup, type PopoverMenuItem } from './menu';
import { filterMenuGroups, getMenuItem, getNextMenuItem, getPreviousMenuItem } from './menu';
import { modalStateEffect } from './modal';
import { type PopoverOptions, popover, popoverRangeEffect, popoverStateField } from './popover';
import { type PopoverMenuProviderProps } from './PopoverMenuProvider';

export type UsePopoverMenuProps = {
  viewRef: RefObject<EditorView | null>;
  filter?: boolean;
  getMenu?: (text: string, trigger?: string) => MaybePromise<PopoverMenuGroup[]>;
} & Pick<PopoverOptions, 'trigger' | 'triggerKey' | 'placeholder'>;

export type UsePopoverMenu = {
  groupsRef: RefObject<PopoverMenuGroup[]>;
  extension: Extension;
} & Pick<PopoverMenuProviderProps, 'currentItem' | 'open' | 'onOpenChange' | 'onActivate' | 'onSelect' | 'onCancel'>;

export const usePopoverMenu = ({
  viewRef,
  trigger,
  triggerKey,
  placeholder,
  filter = true,
  getMenu,
}: UsePopoverMenuProps): UsePopoverMenu => {
  const groupsRef = useRef<PopoverMenuGroup[]>([]);
  const currentRef = useRef<PopoverMenuItem | null>(null);
  const [currentItem, setCurrentItem] = useState<string>();
  const [open, setOpen] = useState(false);
  const [_, refresh] = useState({});

  /**
   * Get filtered options.
   */
  const getMenuOptions = useCallback<NonNullable<UsePopoverMenuProps['getMenu']>>(
    async (text, trigger) => {
      const groups = (await getMenu?.(text, trigger)) ?? [];
      return filter
        ? filterMenuGroups(groups, (item) =>
            text ? (item.label as string).toLowerCase().includes(text.toLowerCase()) : true,
          )
        : groups;
    },
    [getMenu, filter],
  );

  const handleOpenChange = useCallback<NonNullable<UsePopoverMenu['onOpenChange']>>(
    async (open) => {
      console.log('handleOpenChange', open);
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
    [getMenuOptions],
  );

  const handleActivate = useCallback<NonNullable<UsePopoverMenu['onActivate']>>(
    async (event) => {
      const item = getMenuItem(groupsRef.current, currentItem);
      if (item) {
        currentRef.current = item;
      }

      const triggerKey = event.trigger.getAttribute('data-trigger');
      if (!open) {
        handleOpenChange(true, triggerKey || undefined);
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
    const { range, trigger } = view.state.field(popoverStateField) ?? {};
    if (range && trigger) {
      view.dispatch({
        changes: { ...range, insert: '' },
      });
    }
  }, []);

  const serializedTrigger = Array.isArray(trigger) ? trigger.join(',') : trigger;
  const extension = useMemo<Extension>(() => {
    return popover({
      trigger,
      triggerKey,
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
      onTextChange: async (text, trigger) => {
        groupsRef.current = (await getMenuOptions(text, trigger)) ?? [];
        const firstItem = groupsRef.current.filter((group) => group.items.length > 0)[0]?.items[0];
        if (firstItem) {
          setCurrentItem(firstItem.id);
          currentRef.current = firstItem;
        }

        refresh({});
      },
    });
  }, [handleOpenChange, getMenuOptions, serializedTrigger, placeholder]);

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
