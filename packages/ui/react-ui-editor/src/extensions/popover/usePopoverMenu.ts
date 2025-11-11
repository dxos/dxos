//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorState } from '@codemirror/state';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

import { type PopoverMenuGroup, type PopoverMenuItem } from './menu';
import { filterMenuGroups, getMenuItem, getNextMenuItem, getPreviousMenuItem } from './menu';
import { modalStateEffect } from './modal';
import { type PopoverOptions, popover, popoverRangeEffect, popoverStateField } from './popover';
import { type PopoverMenuProviderProps } from './PopoverMenuProvider';

export type GetMenuContext = {
  state: EditorState;
  pos: number;
  text: string;
  trigger?: string;
};

export type UsePopoverMenuProps = {
  filter?: boolean;
  getMenu?: (context: GetMenuContext) => MaybePromise<PopoverMenuGroup[]>;
} & Pick<PopoverOptions, 'trigger' | 'triggerKey' | 'placeholder'>;

export type UsePopoverMenu = {
  groupsRef: RefObject<PopoverMenuGroup[]>;
  extension: Extension;
} & Pick<PopoverMenuProviderProps, 'currentItem' | 'open' | 'onOpenChange' | 'onActivate' | 'onSelect' | 'onCancel'>;

/**
 * ```tsx
 * const { groupsRef, extension, ...menuProps } = usePopoverMenu();
 * const { parentRef, viewRef } = useTextEditor({ extensions: [extension] });
 * return (
 *   <PopoverMenuProvider view={viewRef.current} groups={groupsRef.current} {...menuProps}>
 *     <div ref={parentRef} />
 *   </PopoverMenuProvider>
 * );
 * ```
 */
export const usePopoverMenu = ({
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
    async ({ text, trigger, ...props }) => {
      const groups = (await getMenu?.({ text, trigger, ...props })) ?? [];
      return filter
        ? filterMenuGroups(groups, (item) =>
            text ? (item.label as string).toLowerCase().startsWith(text.toLowerCase()) : true,
          )
        : groups;
    },
    [getMenu, filter],
  );

  const handleOpenChange = useCallback<NonNullable<UsePopoverMenu['onOpenChange']>>(
    async ({ view, open }) => {
      invariant(view);
      setOpen(open);
      if (!open) {
        setCurrentItem(undefined);
        view.dispatch({
          effects: [popoverRangeEffect.of(null)],
        });
      }

      // TODO(burdon): Possible race condition.
      //  useTextEditor.handleKeyDown will get called after this handler completes.
      requestAnimationFrame(() => {
        view.dispatch({
          effects: [modalStateEffect.of(open)],
        });
      });
    },
    [getMenuOptions],
  );

  const handleActivate = useCallback<NonNullable<UsePopoverMenu['onActivate']>>(
    async ({ view, trigger }) => {
      const item = getMenuItem(groupsRef.current, currentItem);
      if (item) {
        currentRef.current = item;
      }

      if (!open) {
        handleOpenChange({ view, open: true, trigger });
      }
    },
    [open, handleOpenChange],
  );

  const handleSelect = useCallback<NonNullable<UsePopoverMenu['onSelect']>>(({ view, item }) => {
    void item.onSelect?.({ view, head: view.state.selection.main.head });
  }, []);

  const handleCancel = useCallback<NonNullable<UsePopoverMenu['onCancel']>>(({ view }) => {
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
      onClose: ({ view }) => handleOpenChange({ view, open: false }),
      onEnter: ({ view }) => {
        if (currentRef.current) {
          handleSelect({ view, item: currentRef.current });
        }
      },
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
      onTextChange: async ({ view, pos, text, trigger }) => {
        groupsRef.current = (await getMenuOptions({ state: view.state, pos, text, trigger })) ?? [];
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
    onOpenChange: handleOpenChange,
    onActivate: handleActivate,
    onSelect: handleSelect,
    onCancel: handleCancel,
  };
};
