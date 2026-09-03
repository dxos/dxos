//
// Copyright 2026 DXOS.org
//

import React, { Fragment, forwardRef } from 'react';

import { type ThemedClassName } from '../../util/index.ts';
import { IconButton, type IconButtonProps } from '../Button/index.ts';
import { Icon } from '../Icon/index.ts';
import { DropdownMenu } from '../Menu/index.ts';

/**
 * One entry in a {@link MenuButton}'s menu.
 *
 * A discriminated union rather than children, so a caller describes the menu it wants instead of
 * assembling five primitives in the right order — the shape every call site had duplicated.
 */
export type MenuButtonItem =
  /** Heading over the entries that follow; not selectable. */
  | { type: 'group'; label: string }
  | { type: 'separator' }
  /**
   * Single-select entry with a trailing check. `DropdownMenu.RadioItem` renders a plain item with
   * no radio semantics, so single-select is modelled here as an item plus an explicit check.
   */
  | { type: 'option'; label: string; selected: boolean; onSelect: () => void; testId?: string }
  | { type: 'checkbox'; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void; testId?: string };

export type MenuButtonProps = ThemedClassName<
  Omit<IconButtonProps, 'children' | 'onSelect'> & {
    items: MenuButtonItem[];
  }
>;

/**
 * An icon button that opens a menu — the composite behind every "options" caret in the app.
 *
 * The button is the trigger and nothing else: it has no action of its own, so a caller that wants a
 * primary action beside its options pairs this with a button of its own (the split control the mic
 * and its settings make).
 */
export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(({ items, ...props }, forwardedRef) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <IconButton {...props} ref={forwardedRef} />
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content>
        <DropdownMenu.Viewport>
          {items.map((item, index) => (
            // Index keys: the entries are a positional list with no identity of their own, and a
            // label repeats across groups (two devices may share a name).
            <Fragment key={index}>
              <MenuButtonEntry item={item} />
            </Fragment>
          ))}
        </DropdownMenu.Viewport>
        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
));

MenuButton.displayName = 'MenuButton';

const MenuButtonEntry = ({ item }: { item: MenuButtonItem }) => {
  switch (item.type) {
    case 'group':
      return <DropdownMenu.GroupLabel>{item.label}</DropdownMenu.GroupLabel>;

    case 'separator':
      return <DropdownMenu.Separator />;

    case 'option':
      return (
        // `onSelect`, not `onClick`, so keyboard activation works.
        <DropdownMenu.Item
          classNames='gap-2'
          role='menuitemradio'
          aria-checked={item.selected}
          data-testid={item.testId}
          onSelect={item.onSelect}
        >
          <span className='grow truncate'>{item.label}</span>
          {item.selected && <Icon icon='ph--check--regular' size={4} />}
        </DropdownMenu.Item>
      );

    case 'checkbox':
      return (
        <DropdownMenu.CheckboxItem
          classNames='gap-2'
          checked={item.checked}
          data-testid={item.testId}
          onCheckedChange={item.onCheckedChange}
        >
          <span className='grow truncate'>{item.label}</span>
          <DropdownMenu.ItemIndicator asChild>
            <Icon icon='ph--check--regular' size={4} />
          </DropdownMenu.ItemIndicator>
        </DropdownMenu.CheckboxItem>
      );
  }
};
