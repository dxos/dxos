//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { Fragment, type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import {
  type DxAnchorActivate,
  Icon,
  Popover,
  toLocalizedString,
  useDynamicRef,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';

import { type PopoverMenuGroup, type PopoverMenuItem } from './menu';

export type PopoverMenuProviderProps = PropsWithChildren<{
  view?: EditorView | null;
  groups?: PopoverMenuGroup[];
  currentItem?: string;
  open?: boolean;
  defaultOpen?: boolean;
  numItems?: number;
  onOpenChange?: (event: { view: EditorView; open: boolean; trigger?: string }) => void;
  onActivate?: (event: { view: EditorView; trigger?: string }) => void;
  onSelect?: (event: { view: EditorView; item: PopoverMenuItem }) => void;
  onCancel?: (event: { view: EditorView }) => void;
}>;

/**
 * Implements the Popover and listens for the `dx-anchor-activate` event from the
 * `popover` extension's decoration.
 *
 * NOTE: We don't use DropdownMenu because the command menu needs to manage focus explicitly.
 * I.e., focus must remain in the editor while displaying the menu (for type-ahead).
 */
export const PopoverMenuProvider = ({
  children,
  view,
  groups,
  currentItem,
  open: openParam,
  defaultOpen,
  numItems = 8,
  onOpenChange,
  onActivate,
  onSelect,
  onCancel,
}: PopoverMenuProviderProps) => {
  const { tx } = useThemeContext();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const viewRef = useDynamicRef(view);
  const [open, setOpen] = useControllableState({
    prop: openParam,
    defaultProp: defaultOpen,
    onChange: (open) => {
      invariant(viewRef.current);
      onOpenChange?.({ view: viewRef.current, open });
    },
  });

  useEffect(() => {
    if (!root) {
      return;
    }

    // Listen for trigger.
    return addEventListener(
      root,
      'dx-anchor-activate' as any,
      (event: DxAnchorActivate) => {
        const { trigger, refId } = event;

        // If this has a `refId`, then it’s probably a URL or DXN and out of scope for this component.
        if (!refId) {
          triggerRef.current = trigger as HTMLButtonElement;
          if (onActivate) {
            onActivate({ view: viewRef.current!, trigger: trigger.getAttribute('data-trigger') ?? undefined });
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
      invariant(viewRef.current);
      onSelect?.({ view: viewRef.current, item });
    },
    [viewRef, onSelect],
  );

  const menuGroups = groups?.filter((group) => group.items.length > 0) ?? [];

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.VirtualTrigger virtualRef={triggerRef} />
      <Popover.Portal>
        <Popover.Content
          align='start'
          classNames={tx('menu.content', 'menu--exotic-unfocusable', { elevation: 'positioned' }, [
            'overflow-y-auto',
            !menuGroups.length && 'hidden',
          ])}
          style={{
            maxBlockSize: 36 * numItems + 10,
          }}
          /**
           * NOTE: We keep the focus in the editor, but Radix routes escape key.
           */
          onEscapeKeyDown={() => {
            // NOTE: Able to cancel if not in valid state.
            // event.preventDefault();
            onCancel?.({ view: view! });
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Popover.Viewport classNames={tx('menu.viewport', 'menu__viewport--exotic-unfocusable', {})}>
            <Menu groups={menuGroups} currentItem={currentItem} onSelect={handleSelect} />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>

      <div ref={setRoot} role='none' className='contents'>
        {children}
      </div>
    </Popover.Root>
  );
};

//
// Menu
//

type MenuProps = {
  groups: PopoverMenuGroup[];
} & Pick<MenuGroupProps, 'currentItem' | 'onSelect'>;

const Menu = ({ groups, currentItem, onSelect }: MenuProps) => {
  const { tx } = useThemeContext();
  return (
    <ul>
      {groups.map((group, index) => (
        <Fragment key={group.id}>
          <MenuGroup group={group} currentItem={currentItem} onSelect={onSelect} />
          {index < groups.length - 1 && <div className={tx('menu.separator', 'menu__item', {})} />}
        </Fragment>
      ))}
    </ul>
  );
};

type MenuGroupProps = {
  group: PopoverMenuGroup;
  currentItem?: string;
} & Pick<MenuItemProps, 'onSelect'>;

const MenuGroup = ({ group, currentItem, onSelect }: MenuGroupProps) => {
  const { tx } = useThemeContext();
  const { t } = useTranslation();

  return (
    <>
      {group.label && (
        <div className={tx('menu.groupLabel', 'menu__group__label', {})}>
          <span>{toLocalizedString(group.label, t)}</span>
        </div>
      )}

      {group.items.map((item) => (
        <MenuItem key={item.id} item={item} current={currentItem === item.id} onSelect={onSelect} />
      ))}
    </>
  );
};

type MenuItemProps = {
  item: PopoverMenuItem;
  current: boolean;
  onSelect?: (item: PopoverMenuItem) => void;
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
    <li
      ref={listRef}
      className={tx('menu.item', 'menu__item--exotic-unfocusable', {}, [current && 'bg-hoverSurface'])}
      onClick={handleSelect}
    >
      {item.icon && <Icon icon={item.icon} size={5} />}
      <span className='grow truncate'>{toLocalizedString(item.label, t)}</span>
    </li>
  );
};
