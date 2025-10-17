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

import { type CommandMenuGroup, type CommandMenuItem } from './menu';

export type CommandMenuProps = PropsWithChildren<{
  groups: CommandMenuGroup[];
  currentItem?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onSelect: (item: CommandMenuItem) => void;
  onActivate?: (event: DxAnchorActivate) => void;
  onOpenChange?: (nextOpen: boolean, trigger?: string) => void;
}>;

// NOTE: Not using DropdownMenu because the command menu needs to manage focus explicitly.
export const CommandMenuProvider = ({
  children,
  groups,
  currentItem,
  open: propsOpen,
  defaultOpen,
  onSelect,
  onActivate,
  onOpenChange,
}: CommandMenuProps) => {
  const { tx } = useThemeContext();
  const groupsWithItems = groups.filter((group) => group.items.length > 0);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useControllableState({
    prop: propsOpen,
    onChange: onOpenChange,
    defaultProp: defaultOpen,
  });

  const handleDxAnchorActivate = useCallback(
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
    [onActivate],
  );

  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef || !handleDxAnchorActivate) {
      return;
    }

    return addEventListener(rootRef, 'dx-anchor-activate' as any, handleDxAnchorActivate, {
      capture: true,
      passive: false,
    });
  }, [rootRef, handleDxAnchorActivate]);

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.Portal>
        <Popover.Content
          align='start'
          onOpenAutoFocus={(event) => event.preventDefault()}
          classNames={tx('menu.content', 'menu--exotic-unfocusable', { elevation: 'positioned' }, [
            'max-bs-80 overflow-y-auto',
          ])}
        >
          <Popover.Viewport classNames={tx('menu.viewport', 'menu__viewport--exotic-unfocusable', {})}>
            <ul>
              {groupsWithItems.map((group, index) => (
                <Fragment key={group.id}>
                  <CommandGroup group={group} currentItem={currentItem} onSelect={onSelect} />
                  {index < groupsWithItems.length - 1 && <div className={tx('menu.separator', 'menu__item', {})} />}
                </Fragment>
              ))}
            </ul>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
      <Popover.VirtualTrigger virtualRef={trigger} />
      <div role='none' className='contents' ref={setRootRef}>
        {children}
      </div>
    </Popover.Root>
  );
};

const CommandGroup = ({
  group,
  currentItem,
  onSelect,
}: {
  group: CommandMenuGroup;
  currentItem?: string;
  onSelect: (item: CommandMenuItem) => void;
}) => {
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
        <CommandItem key={item.id} item={item} current={currentItem === item.id} onSelect={onSelect} />
      ))}
    </>
  );
};

const CommandItem = ({
  item,
  current,
  onSelect,
}: {
  item: CommandMenuItem;
  current: boolean;
  onSelect: (item: CommandMenuItem) => void;
}) => {
  const ref = useRef<HTMLLIElement>(null);
  const { tx } = useThemeContext();
  const { t } = useTranslation();
  const handleSelect = useCallback(() => onSelect(item), [item, onSelect]);

  useEffect(() => {
    if (current && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [current]);

  return (
    <li
      ref={ref}
      className={tx('menu.item', 'menu__item--exotic-unfocusable', {}, [current && 'bg-hoverSurface'])}
      onClick={handleSelect}
    >
      {item.icon && <Icon icon={item.icon} size={5} />}
      <span className='grow truncate'>{toLocalizedString(item.label, t)}</span>
    </li>
  );
};
