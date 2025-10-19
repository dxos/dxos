//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { Fragment, type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import {
  type DxAnchorActivate,
  Icon,
  Popover,
  toLocalizedString,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';

import { type PopoverMenuGroup, type PopoverMenuItem } from './menu';

export type PopoverMenuProviderProps = PropsWithChildren<{
  groups: PopoverMenuGroup[];
  currentItem?: string;
  open?: boolean;
  defaultOpen?: boolean;
  numLines?: number;
  onOpenChange?: (nextOpen: boolean, trigger?: string) => void;
  onActivate?: (event: DxAnchorActivate) => void;
  onSelect: (item: PopoverMenuItem) => void;
  onCancel?: () => void;
}>;

/**
 * NOTE: We don't use DropdownMenu because the command menu needs to manage focus explicitly.
 */
export const PopoverMenuProvider = ({
  children,
  groups,
  currentItem,
  open: openParam,
  defaultOpen,
  numLines = 8,
  onOpenChange,
  onActivate,
  onSelect,
  onCancel,
}: PopoverMenuProviderProps) => {
  const { tx } = useThemeContext();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useControllableState({
    prop: openParam,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  useEffect(() => {
    if (!root) {
      return;
    }

    return addEventListener(
      root,
      'dx-anchor-activate' as any,
      (event: DxAnchorActivate) => {
        const { trigger: dxTrigger, refId } = event;
        // If this has a `refId`, then it’s probably a URL or DXN and out of scope for this component.
        if (!refId) {
          trigger.current = dxTrigger as HTMLButtonElement;
          if (onActivate) {
            onActivate(event);
          } else {
            queueMicrotask(() => setOpen(true));
          }
        }
      },
      {
        capture: true,
        passive: false,
      },
    );
  }, [root, onActivate]);

  const menuGroups = groups.filter((group) => group.items.length > 0);

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.VirtualTrigger virtualRef={trigger} />
      <Popover.Portal>
        <Popover.Content
          align='start'
          classNames={tx('menu.content', 'menu--exotic-unfocusable', { elevation: 'positioned' }, [
            'overflow-y-auto',
            !menuGroups.length && 'hidden',
          ])}
          style={{
            maxBlockSize: 36 * numLines + 6,
          }}
          onEscapeKeyDown={(event) => {
            console.log('onEscapeKeyDown');
            // TODO(burdon): Prevent Tabster from handling escape.
            event.preventDefault();
            event.stopPropagation();
            onCancel?.();
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Popover.Viewport classNames={tx('menu.viewport', 'menu__viewport--exotic-unfocusable', {})}>
            <Menu groups={menuGroups} currentItem={currentItem} onSelect={onSelect} />
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
} & Pick<PopoverMenuProviderProps, 'currentItem' | 'onSelect'>;

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
} & Pick<PopoverMenuProviderProps, 'onSelect'>;

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
  onSelect: (item: PopoverMenuItem) => void;
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

  const handleSelect = useCallback(() => onSelect(item), [item, onSelect]);

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
