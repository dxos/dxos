//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { Fragment, type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import {
  DX_ANCHOR_ACTIVATE,
  type DxAnchorActivate,
  Icon,
  Popover,
  ScrollArea,
  toLocalizedString,
  useDynamicRef,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';

import { type EditorMenuGroup, type EditorMenuItem } from './menu';

export type EditorMenuProviderProps = PropsWithChildren<{
  // Provided as a getter (not a value prop) so the live `EditorView` is never carried in a React prop that
  // the dev render-logger would walk into a cross-origin frame. See `controller.ts` for the full rationale.
  getView?: () => EditorView | null;
  groups?: EditorMenuGroup[];
  currentItem?: string;
  open?: boolean;
  defaultOpen?: boolean;
  numItems?: number;
  onOpenChange?: (event: { view: EditorView; open: boolean; trigger?: string }) => void;
  onActivate?: (event: { view: EditorView; trigger?: string }) => void;
  onSelect?: (event: { view: EditorView; item: EditorMenuItem }) => void;
  onCancel?: (event: { view: EditorView }) => void;
}>;

/**
 * Implements the Popover and listens for the `dx-anchor-activate` event from the `popover` extension's decoration.
 * NOTE: We don't use DropdownMenu because the command menu needs to manage focus explicitly.
 * I.e., focus must remain in the editor while displaying the menu (for type-ahead).
 */
export const EditorMenuProvider = ({
  children,
  getView,
  groups,
  currentItem,
  open: openProp,
  defaultOpen,
  numItems = 8,
  onOpenChange,
  onActivate,
  onSelect,
  onCancel,
}: EditorMenuProviderProps) => {
  const { tx } = useThemeContext();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Hold the latest `getView` so callbacks/effects always read the current view without re-subscribing.
  const getViewRef = useDynamicRef(getView);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: (open) => {
      const view = getViewRef.current?.();
      invariant(view);
      onOpenChange?.({ view, open });
    },
  });

  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!root) {
      return;
    }

    // Listen for trigger.
    return addEventListener(
      root,
      DX_ANCHOR_ACTIVATE as any,
      (event: DxAnchorActivate) => {
        const { trigger, dxn } = event;
        if (!dxn) {
          triggerRef.current = trigger as HTMLButtonElement;
          if (onActivate) {
            const view = getViewRef.current?.();
            if (view) {
              onActivate({ view, trigger: trigger.getAttribute('data-trigger') ?? undefined });
            }
          } else {
            requestAnimationFrame(() => setOpen(true));
          }
        }
      },
      {
        capture: true,
        passive: false,
      },
    );
  }, [root, onActivate]);

  const handleSelect = useCallback<NonNullable<MenuProps['onSelect']>>(
    (item) => {
      const view = getViewRef.current?.();
      invariant(view);
      onSelect?.({ view, item });
    },
    [getViewRef, onSelect],
  );

  const menuGroups = groups?.filter((group) => group.items.length > 0) ?? [];

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.VirtualTrigger virtualRef={triggerRef} />

      {/* Menu. */}
      <Popover.Portal>
        <Popover.Content
          align='start'
          classNames={['flex flex-col', !menuGroups.length && 'hidden']}
          style={{
            maxBlockSize: 36 * numItems + 10,
          }}
          // NOTE: We keep the focus in the editor, but Radix routes escape key.
          onEscapeKeyDown={() => {
            const currentView = getViewRef.current?.();
            if (currentView) {
              onCancel?.({ view: currentView });
            }
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Popover.Viewport asChild classNames='dx-container'>
            <ScrollArea.Root thin>
              <ScrollArea.Viewport>
                <Menu groups={menuGroups} currentItem={currentItem} onSelect={handleSelect} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>

      {/* Content */}
      <div className='contents' ref={setRoot}>
        {children}
      </div>
    </Popover.Root>
  );
};

//
// Menu
//

type MenuProps = {
  groups: EditorMenuGroup[];
} & Pick<MenuGroupProps, 'currentItem' | 'onSelect'>;

const Menu = ({ groups, currentItem, onSelect }: MenuProps) => {
  const { tx } = useThemeContext();
  return (
    <ul>
      {groups.map((group, index) => (
        <Fragment key={group.id}>
          <MenuGroup group={group} currentItem={currentItem} onSelect={onSelect} />
          {index < groups.length - 1 && <div className={tx('menu.separator', {})} />}
        </Fragment>
      ))}
    </ul>
  );
};

//
// Menu Group
//

type MenuGroupProps = {
  group: EditorMenuGroup;
  currentItem?: string;
} & Pick<MenuItemProps, 'onSelect'>;

const MenuGroup = ({ group, currentItem, onSelect }: MenuGroupProps) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation();

  return (
    <>
      {group.label && (
        <div className={tx('menu.groupLabel', {})}>
          <span>{toLocalizedString(group.label, t)}</span>
        </div>
      )}

      {group.items.map((item) => (
        <MenuItem key={item.id} item={item} current={currentItem === item.id} onSelect={onSelect} />
      ))}
    </>
  );
};

//
// Menu Item
//

type MenuItemProps = {
  item: EditorMenuItem;
  current: boolean;
  onSelect?: (item: EditorMenuItem) => void;
};

const MenuItem = ({ item, current, onSelect }: MenuItemProps) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation();

  const listRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (current && listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [current]);

  const handleSelect = useCallback(() => onSelect?.(item), [item, onSelect]);

  return (
    <li ref={listRef} className={tx('menu.item', {}, [current && 'bg-hover-surface'])} onClick={handleSelect}>
      {item.icon && <Icon icon={item.icon} />}
      <span className='grow truncate'>{toLocalizedString(item.label, t)}</span>
    </li>
  );
};
