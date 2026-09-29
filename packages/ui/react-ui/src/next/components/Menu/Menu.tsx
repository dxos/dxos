//
// Copyright 2026 DXOS.org
//

import { Menu as MenuPrimitive, useMenuContext } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import React, { type ReactNode, type RefObject, createContext, forwardRef, useContext } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon } from '../Icon/index.ts';
import { PopupScroll, popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

//
// Root
//

type MenuRootProps = MenuPrimitive.RootProps;

/**
 * The enclosing menu: its `onSelect`, so a nested menu reports its selections to the root by default, and whether it
 * is a `Menu.Sub`, whose Content lines its first item up with the SubTrigger row.
 */
const MenuContext = createContext<{ onSelect?: MenuRootProps['onSelect']; sub: boolean }>({ sub: false });

const MenuRootBase = ({
  lazyMount = true,
  unmountOnExit = true,
  positioning,
  onSelect,
  sub,
  ...props
}: MenuRootProps & { sub: boolean }) => (
  <MenuContext.Provider value={{ onSelect, sub }}>
    <MenuPrimitive.Root
      {...props}
      onSelect={onSelect}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      // Ark's 8px default reads as detached from the trigger.
      positioning={popupPositioning(POPUP_GUTTER, positioning)}
    />
  </MenuContext.Provider>
);

/**
 * Ark menu; content mounts on open and unmounts on close unless the caller opts out. With no Trigger (a virtual
 * trigger), open it under control and anchor it with `positioning.getAnchorRect` (Ark has no virtual-trigger part).
 */
const MenuRoot = (props: MenuRootProps) => <MenuRootBase {...props} sub={false} />;

MenuRoot.displayName = 'Next.Menu.Root';

//
// Trigger
//

type MenuTriggerProps = MenuPrimitive.TriggerProps;

/** Use `asChild` to open the menu from a `Next.Button`. */
const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>((props, forwardedRef) => (
  <MenuPrimitive.Trigger {...props} ref={forwardedRef} />
));

MenuTrigger.displayName = 'Next.Menu.Trigger';

//
// ContextTrigger
//

type MenuContextTriggerProps = MenuPrimitive.ContextTriggerProps;

/** Opens the menu at the pointer on right-click (or long-press); use `asChild` to make a region the target. */
const MenuContextTrigger = forwardRef<HTMLButtonElement, MenuContextTriggerProps>((props, forwardedRef) => (
  <MenuPrimitive.ContextTrigger {...props} ref={forwardedRef} />
));

MenuContextTrigger.displayName = 'Next.Menu.ContextTrigger';

//
// Content
//

type MenuContentProps = ThemedClassName<MenuPrimitive.ContentProps> & {
  /** Overrides the size inherited from the trigger's nearest sized ancestor (Phase 4 decision 2); `md` without one. */
  size?: Size;
  /** Point at the trigger with an arrow in the popup's surface colour, like Popover's; off by default for menus. */
  arrow?: boolean;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
};

/**
 * Ark's content as a composable part, so the ScrollArea viewport slot merges onto it (a plain Ark part gets the dev
 * warning wrapper, which breaks the frame's child rules); it restates Ark's scope and part, which the slot's replace.
 */
const MenuViewport = composable<HTMLDivElement, MenuPrimitive.ContentProps>((props, forwardedRef) => (
  <MenuPrimitive.Content {...composableProps(props)} data-scope='menu' data-part='content' ref={forwardedRef} />
));

/**
 * Portalled menu at `level='popup'`, scrolling in a thin ScrollArea whose viewport is the menu itself; a nested menu's
 * Content is the same part inside a `Menu.Sub`.
 */
const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  ({ classNames, size, arrow = false, container, children, ...props }, forwardedRef) => {
    const { sub } = useContext(MenuContext);
    const menu = useMenuContext();
    // A Sub's trigger is its item in the parent menu, so it inherits the parent popup's size.
    const popupSize = usePopupSize(
      size,
      menu.open,
      [menu.getTriggerProps().id, menu.getContextTriggerProps().id],
      'md',
    );
    return (
      <Portal container={container}>
        <MenuPrimitive.Positioner>
          <PopupScroll
            size={popupSize}
            classNames={mx(recipes.menuContent(), sub && recipes.submenuContent(), classNames)}
            outside={
              arrow && (
                <MenuPrimitive.Arrow className={recipes.arrow()}>
                  <MenuPrimitive.ArrowTip className={recipes.arrowTip()} />
                </MenuPrimitive.Arrow>
              )
            }
          >
            <MenuViewport {...props} ref={forwardedRef}>
              {children}
            </MenuViewport>
          </PopupScroll>
        </MenuPrimitive.Positioner>
      </Portal>
    );
  },
);

MenuContent.displayName = 'Next.Menu.Content';

//
// Item
//

type MenuItemProps = ThemedClassName<MenuPrimitive.ItemProps> & {
  /** Leading icon. */
  icon?: string;
  /** Trailing keyboard hint, e.g. `⌘C`; display only. */
  shortcut?: string;
};

/** A block-tall row: optional leading Icon, the label, and an optional trailing shortcut. */
const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ classNames, icon, shortcut, children, ...props }, forwardedRef) => (
    <MenuPrimitive.Item {...props} className={mx(recipes.menuItem(), classNames)} ref={forwardedRef}>
      {icon && <Icon icon={icon} />}
      <MenuPrimitive.ItemText className={recipes.menuItemText()}>{children}</MenuPrimitive.ItemText>
      {shortcut && (
        <kbd aria-hidden className={recipes.menuShortcut()}>
          {shortcut}
        </kbd>
      )}
    </MenuPrimitive.Item>
  ),
);

MenuItem.displayName = 'Next.Menu.Item';

//
// ItemIndicator
//

type MenuItemIndicatorProps = ThemedClassName<MenuPrimitive.ItemIndicatorProps>;

/** Shown while a checkbox or radio item is checked; a check by default. */
const MenuItemIndicator = forwardRef<HTMLDivElement, MenuItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <MenuPrimitive.ItemIndicator {...props} className={mx(recipes.menuIndicator(), classNames)} ref={forwardedRef}>
      {children ?? <Icon icon='ph--check--regular' />}
    </MenuPrimitive.ItemIndicator>
  ),
);

MenuItemIndicator.displayName = 'Next.Menu.ItemIndicator';

/** The leading cell of an option item: an icon-sized slot, so labels align whether or not the item is checked. */
const IndicatorCell = ({ indicator }: { indicator?: ReactNode }) => (
  <span aria-hidden data-scope='menu' data-part='indicator-cell' className={recipes.menuIndicatorCell()}>
    <MenuItemIndicator>{indicator}</MenuItemIndicator>
  </span>
);

//
// CheckboxItem
//

type MenuCheckboxItemProps = ThemedClassName<MenuPrimitive.CheckboxItemProps> & {
  /** Trailing keyboard hint, e.g. `⌘B`; display only. */
  shortcut?: string;
};

/** A `menuitemcheckbox` row: a check cell, the label and an optional shortcut; selecting it toggles `checked`. */
const MenuCheckboxItem = forwardRef<HTMLDivElement, MenuCheckboxItemProps>(
  ({ classNames, shortcut, children, ...props }, forwardedRef) => (
    <MenuPrimitive.CheckboxItem {...props} className={mx(recipes.menuItem(), classNames)} ref={forwardedRef}>
      <IndicatorCell />
      <MenuPrimitive.ItemText className={recipes.menuItemText()}>{children}</MenuPrimitive.ItemText>
      {shortcut && (
        <kbd aria-hidden className={recipes.menuShortcut()}>
          {shortcut}
        </kbd>
      )}
    </MenuPrimitive.CheckboxItem>
  ),
);

MenuCheckboxItem.displayName = 'Next.Menu.CheckboxItem';

//
// RadioGroup
//

type MenuRadioGroupProps = ThemedClassName<MenuPrimitive.RadioItemGroupProps>;

/** A group of radio items holding one `value`; name it with an `ItemGroupLabel` inside. */
const MenuRadioGroup = forwardRef<HTMLDivElement, MenuRadioGroupProps>(({ classNames, ...props }, forwardedRef) => (
  <MenuPrimitive.RadioItemGroup {...props} className={mx(classNames)} ref={forwardedRef} />
));

MenuRadioGroup.displayName = 'Next.Menu.RadioGroup';

//
// RadioItem
//

type MenuRadioItemProps = ThemedClassName<MenuPrimitive.RadioItemProps>;

/** A `menuitemradio` row with a dot in the indicator cell while it holds its group's value. */
const MenuRadioItem = forwardRef<HTMLDivElement, MenuRadioItemProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <MenuPrimitive.RadioItem {...props} className={mx(recipes.menuItem(), classNames)} ref={forwardedRef}>
      <IndicatorCell indicator={<Icon icon='ph--dot-outline--fill' />} />
      <MenuPrimitive.ItemText className={recipes.menuItemText()}>{children}</MenuPrimitive.ItemText>
    </MenuPrimitive.RadioItem>
  ),
);

MenuRadioItem.displayName = 'Next.Menu.RadioItem';

//
// Sub
//

type MenuSubProps = MenuRootProps;

/**
 * A nested menu: a Root inside a parent's Content, opened by its `SubTrigger` and placed beside it. Ark reports a
 * nested item only to its own menu, so without an `onSelect` of its own a Sub forwards selections to its parent's.
 */
const MenuSub = ({ positioning, onSelect, ...props }: MenuSubProps) => {
  const parent = useContext(MenuContext);
  return (
    <MenuRootBase
      {...props}
      sub
      onSelect={onSelect ?? parent.onSelect}
      positioning={{ placement: 'right-start', gutter: 0, ...positioning }}
    />
  );
};

MenuSub.displayName = 'Next.Menu.Sub';

//
// SubTrigger
//

type MenuSubTriggerProps = ThemedClassName<MenuPrimitive.TriggerItemProps> & {
  /** Leading icon. */
  icon?: string;
};

/** An item row that opens its `Menu.Sub` (hover, ArrowRight or Enter), with a trailing caret. */
const MenuSubTrigger = forwardRef<HTMLDivElement, MenuSubTriggerProps>(
  ({ classNames, icon, children, ...props }, forwardedRef) => (
    <MenuPrimitive.TriggerItem {...props} className={mx(recipes.menuItem(), classNames)} ref={forwardedRef}>
      {icon && <Icon icon={icon} />}
      <span data-scope='menu' data-part='item-text' className={recipes.menuItemText()}>
        {children}
      </span>
      <Icon icon='ph--caret-right--regular' />
    </MenuPrimitive.TriggerItem>
  ),
);

MenuSubTrigger.displayName = 'Next.Menu.SubTrigger';

//
// Separator
//

type MenuSeparatorProps = ThemedClassName<MenuPrimitive.SeparatorProps>;

/** Ark's separator (`role=separator`) with `Next.Separator`'s horizontal rule. */
const MenuSeparator = forwardRef<HTMLHRElement, MenuSeparatorProps>(({ classNames, ...props }, forwardedRef) => (
  <MenuPrimitive.Separator
    {...props}
    data-orientation='horizontal'
    className={mx(recipes.separator(), classNames)}
    ref={forwardedRef}
  />
));

MenuSeparator.displayName = 'Next.Menu.Separator';

//
// ItemGroup
//

type MenuItemGroupProps = ThemedClassName<MenuPrimitive.ItemGroupProps>;

const MenuItemGroup = forwardRef<HTMLDivElement, MenuItemGroupProps>(({ classNames, ...props }, forwardedRef) => (
  <MenuPrimitive.ItemGroup {...props} className={mx(classNames)} ref={forwardedRef} />
));

MenuItemGroup.displayName = 'Next.Menu.ItemGroup';

//
// ItemGroupLabel
//

type MenuItemGroupLabelProps = ThemedClassName<MenuPrimitive.ItemGroupLabelProps>;

/** A small caption naming the group that follows. */
const MenuItemGroupLabel = forwardRef<HTMLDivElement, MenuItemGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <MenuPrimitive.ItemGroupLabel {...props} className={mx(recipes.popupGroupLabel(), classNames)} ref={forwardedRef} />
  ),
);

MenuItemGroupLabel.displayName = 'Next.Menu.ItemGroupLabel';

export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  ContextTrigger: MenuContextTrigger,
  Content: MenuContent,
  Item: MenuItem,
  ItemIndicator: MenuItemIndicator,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  Separator: MenuSeparator,
  ItemGroup: MenuItemGroup,
  ItemGroupLabel: MenuItemGroupLabel,
};

export type {
  MenuCheckboxItemProps,
  MenuContentProps,
  MenuContextTriggerProps,
  MenuItemGroupLabelProps,
  MenuItemGroupProps,
  MenuItemIndicatorProps,
  MenuItemProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuSubProps,
  MenuSubTriggerProps,
  MenuTriggerProps,
};
