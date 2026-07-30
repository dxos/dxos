//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorState } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
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
  /**
   * Triggers whose menu is rendered as a combobox: the popover owns a search input and the query is
   * typed there rather than into the document.
   */
  searchTriggers?: string[];
  getMenu?: (context: GetMenuContext) => MaybePromise<EditorMenuGroup[]>;
} & Pick<PopoverOptions, 'trigger' | 'triggerKey' | 'placeholder' | 'activateOnTyping'>;

export type UseEditorMenu = {
  groupsRef: RefObject<EditorMenuGroup[]>;
  extension: Extension;
} & Pick<
  EditorMenuProviderProps,
  | 'currentItem'
  | 'open'
  | 'search'
  | 'query'
  | 'onOpenChange'
  | 'onActivate'
  | 'onSelect'
  | 'onCancel'
  | 'onQueryChange'
  | 'onNavigate'
>;

/**
 * ```tsx
 * const { groupsRef, extension, ...menuProps } = useEditorMenu();
 * const { parentRef, viewRef } = useTextEditor({ extensions: [extension] });
 * return (
 *   <EditorMenuProvider getView={() => viewRef.current} groups={groupsRef.current} {...menuProps}>
 *     <div ref={parentRef} />
 *   </EditorMenuProvider>
 * );
 * ```
 */
export const useEditorMenu = ({
  trigger,
  triggerKey,
  placeholder,
  activateOnTyping,
  filter = true,
  searchTriggers,
  getMenu,
}: UseEditorMenuProps): UseEditorMenu => {
  const groupsRef = useRef<EditorMenuGroup[]>([]);
  const currentRef = useRef<EditorMenuItem | null>(null);
  const [currentItem, setCurrentItem] = useState<string>();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [_, refresh] = useState({});

  // The document range only supplies the trigger-relative prefix (e.g. the second "@" of a block
  // embed); in search mode the rest of the query comes from the popover's input.
  const contextRef = useRef<{ view: EditorView; pos: number; text: string; trigger?: string } | null>(null);

  /**
   * Get filtered options.
   */
  const getMenuOptions = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
    async ({ text, trigger, ...props }) => {
      const groups = (await getMenu?.({ text, trigger, ...props })) ?? [];
      // The "@" menu can use "@@" as syntax for block embeds, so it owns its own query filtering.
      return filter && trigger !== '@'
        ? filterMenuGroups(groups, (item) =>
            text ? (item.label as string).toLowerCase().startsWith(text.toLowerCase()) : true,
          )
        : groups;
    },
    [getMenu, filter],
  );

  /**
   * Recompute the menu and preselect the first item.
   */
  const updateGroups = useCallback(
    async ({ view, pos, text, trigger }: { view: EditorView; pos: number; text: string; trigger?: string }) => {
      groupsRef.current = (await getMenuOptions({ state: view.state, pos, text, trigger })) ?? [];
      const firstItem = groupsRef.current.filter((group) => group.items.length > 0)[0]?.items[0];
      if (firstItem) {
        setCurrentItem(firstItem.id);
        currentRef.current = firstItem;
      } else {
        // No matches: clear the selection so Enter falls through instead of
        // selecting a stale item from a previous query.
        setCurrentItem(undefined);
        currentRef.current = null;
      }

      refresh({});
    },
    [getMenuOptions],
  );

  const handleOpenChange = useCallback<NonNullable<UseEditorMenu['onOpenChange']>>(
    async ({ view, open }) => {
      invariant(view);
      setOpen(open);
      if (!open) {
        setCurrentItem(undefined);
        setSearch(false);
        setQuery('');
        contextRef.current = null;
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
    // Delete trigger range (e.g., "/" and any typed filter text).
    const { range } = view.state.field(popoverStateField) ?? {};
    if (range) {
      view.dispatch({ changes: { from: range.from, to: range.to, insert: '' } });
    }
    void item.onSelect?.({ view, head: view.state.selection.main.head });
    view.focus();
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

  const handleQueryChange = useCallback<NonNullable<UseEditorMenu['onQueryChange']>>(
    (query) => {
      setQuery(query);
      const context = contextRef.current;
      if (context) {
        void updateGroups({ ...context, text: context.text + query });
      }
    },
    [updateGroups],
  );

  const handleNavigate = useCallback<NonNullable<UseEditorMenu['onNavigate']>>((direction) => {
    setCurrentItem((currentItem) => {
      const next =
        direction === 'up'
          ? getPreviousMenuItem(groupsRef.current, currentItem)
          : getNextMenuItem(groupsRef.current, currentItem);
      currentRef.current = next;
      return next.id;
    });
  }, []);

  const serializedTrigger = Array.isArray(trigger) ? trigger.join(',') : trigger;
  const serializedSearchTriggers = searchTriggers?.join(',');
  const extension = useMemo<Extension>(() => {
    return popover({
      trigger,
      triggerKey,
      placeholder,
      activateOnTyping,
      onClose: ({ view }) => handleOpenChange({ view, open: false }),
      onEnter: ({ view }) => {
        if (currentRef.current) {
          handleSelect({ view, item: currentRef.current });
          return true;
        }
        return false;
      },
      onArrowUp: () => handleNavigate('up'),
      onArrowDown: () => handleNavigate('down'),
      onTextChange: async ({ view, pos, text, trigger }) => {
        contextRef.current = { view, pos, text, trigger };
        // The input is remounted per activation, so the query always starts empty.
        setSearch(!!trigger && !!searchTriggers?.includes(trigger));
        setQuery('');
        await updateGroups({ view, pos, text, trigger });
      },
    });
  }, [
    handleOpenChange,
    handleNavigate,
    updateGroups,
    serializedTrigger,
    serializedSearchTriggers,
    placeholder,
    activateOnTyping,
  ]);

  return {
    groupsRef,
    extension,
    currentItem,
    open,
    search,
    query,
    onOpenChange: handleOpenChange,
    onActivate: handleActivate,
    onSelect: handleSelect,
    onCancel: handleCancel,
    onQueryChange: handleQueryChange,
    onNavigate: handleNavigate,
  };
};
