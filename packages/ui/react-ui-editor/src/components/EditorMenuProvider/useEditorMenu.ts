//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorState } from '@codemirror/state';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { modalStateEffect } from '@dxos/ui-editor';
import { type MaybePromise } from '@dxos/util';

import { type EditorMenuProviderProps } from './EditorMenuProvider';
import { type EditorMenuGroup, type EditorMenuItem } from './menu';
import { filterMenuGroups, getMenuItem, getNextMenuItem, getPreviousMenuItem } from './menu';
import { type PopoverOptions, popover, popoverRangeEffect, popoverStateField } from './popover';

export type GetMenuContext = {
  state: EditorState;
  pos: number;
  text: string;
  trigger?: string;
};

export type UseEditorMenuProps = {
  filter?: boolean;
  getMenu?: (context: GetMenuContext) => MaybePromise<EditorMenuGroup[]>;
} & Pick<PopoverOptions, 'trigger' | 'triggerKey' | 'placeholder'>;

export type UseEditorMenu = {
  groupsRef: RefObject<EditorMenuGroup[]>;
  extension: Extension;
} & Pick<EditorMenuProviderProps, 'currentItem' | 'open' | 'onOpenChange' | 'onActivate' | 'onSelect' | 'onCancel'>;

/**
 * ```tsx
 * const { groupsRef, extension, ...menuProps } = useEditorMenu();
 * const { parentRef, viewRef } = useTextEditor({ extensions: [extension] });
 * return (
 *   <EditorMenuProvider view={viewRef.current} groups={groupsRef.current} {...menuProps}>
 *     <div ref={parentRef} />
 *   </EditorMenuProvider>
 * );
 * ```
 */
export const useEditorMenu = ({
  trigger,
  triggerKey,
  placeholder,
  filter = true,
  getMenu,
}: UseEditorMenuProps): UseEditorMenu => {
  const groupsRef = useRef<EditorMenuGroup[]>([]);
  const currentRef = useRef<EditorMenuItem | null>(null);
  const [currentItem, setCurrentItem] = useState<string>();
  const [open, setOpen] = useState(false);
  const [_, refresh] = useState({});

  /**
   * Get filtered options.
   */
  const getMenuOptions = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
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

  const handleOpenChange = useCallback<NonNullable<UseEditorMenu['onOpenChange']>>(
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

  const handleActivate = useCallback<NonNullable<UseEditorMenu['onActivate']>>(
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

  const handleSelect = useCallback<NonNullable<UseEditorMenu['onSelect']>>(({ view, item }) => {
    void item.onSelect?.({ view, head: view.state.selection.main.head });
  }, []);

  const handleCancel = useCallback<NonNullable<UseEditorMenu['onCancel']>>(({ view }) => {
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
