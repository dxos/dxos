//
// Copyright 2026 DXOS.org
//

import { Menu as MenuPrimitive, useMenuContext } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
} from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon, type IconProps } from '../Icon/index.ts';
import { PopupScroll, popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

//
// Root
//

type MenuRootProps = MenuPrimitive.RootProps;

/**
 * The enclosing menu: its `onSelect`, so a nested menu reports its selections to the root by default, and whether it
 * is a `Menu.Sub`, whose Content lines its first item up with the TriggerItem row.
 */
type MenuContextValue = {
  onSelect?: MenuRootProps['onSelect'];
  sub: boolean;
  /** Whether the menu was last opened at the pointer (ContextTrigger), where an arrow has no trigger to point at. */
  atPointer: boolean;
  setAtPointer?: (atPointer: boolean) => void;
};

const MenuContext = createContext<MenuContextValue>({ sub: false, atPointer: false });

const MenuRootBase = ({
  lazyMount = true,
  unmountOnExit = true,
  positioning,
  onSelect,
  sub,
  ...props
}: MenuRootProps & { sub: boolean }) => {
  const [atPointer, setAtPointer] = useState(false);
  return (
    <MenuContext.Provider value={{ onSelect, sub, atPointer, setAtPointer }}>
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
};

/**
 * Ark menu; content mounts on open and unmounts on close unless the caller opts out. With no Trigger (a virtual
 * trigger), open it under control and anchor it with `positioning={useVirtualAnchor(ref)}`.
 */
const MenuRoot = (props: MenuRootProps) => <MenuRootBase {...props} sub={false} />;

MenuRoot.displayName = 'Next.Menu.Root';

//
// Trigger
//

type MenuTriggerProps = MenuPrimitive.TriggerProps;

/** Use `asChild` to open the menu from a `Next.Button`. */
const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(
  ({ onPointerDown, onKeyDown, ...props }, forwardedRef) => {
    const { setAtPointer } = useContext(MenuContext);
    return (
      <MenuPrimitive.Trigger
        {...props}
        onPointerDown={(event) => {
          setAtPointer?.(false);
          onPointerDown?.(event);
        }}
        onKeyDown={(event) => {
          setAtPointer?.(false);
          onKeyDown?.(event);
        }}
        ref={forwardedRef}
      />
    );
  },
);

MenuTrigger.displayName = 'Next.Menu.Trigger';

//
// ContextTrigger
//

type MenuContextTriggerProps = MenuPrimitive.ContextTriggerProps;

/** Opens the menu at the pointer on right-click (or long-press); use `asChild` to make a region the target. */
const MenuContextTrigger = forwardRef<HTMLButtonElement, MenuContextTriggerProps>(
  ({ onContextMenu, ...props }, forwardedRef) => {
    const { setAtPointer } = useContext(MenuContext);
    return (
      <MenuPrimitive.ContextTrigger
        {...props}
        onContextMenu={(event) => {
          setAtPointer?.(true);
          onContextMenu?.(event);
        }}
        ref={forwardedRef}
      />
    );
  },
);

MenuContextTrigger.displayName = 'Next.Menu.ContextTrigger';

//
// Content
//

type MenuContentProps = ThemedClassName<MenuPrimitive.ContentProps> & {
  /** Overrides the size inherited from the trigger's nearest sized ancestor (Phase 4 decision 2); `md` without one. */
  size?: Size;
  /** Point at the trigger with an arrow in the popup's surface colour, like Popover's; on by default, off for submenus. */
  arrow?: boolean;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
  /** Lays the items out as a grid of square cells, this many to a row (e.g. a palette of swatches). */
  columns?: number;
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
  ({ classNames, size, arrow: arrowProp, container, columns, style, children, ...props }, forwardedRef) => {
    const { sub, atPointer } = useContext(MenuContext);
    // A submenu opens beside its row and a context menu at the pointer: neither has a trigger to point at.
    const arrow = arrowProp ?? (!sub && !atPointer);
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
            <MenuViewport
              {...props}
              data-columns={columns}
              style={columns ? { ...style, gridTemplateColumns: `repeat(${columns}, var(--nx-block-size))` } : style}
              ref={forwardedRef}
            >
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

/** What a row shows: its default layout renders the icon, label and shortcut. */
export type MenuItemData = {
  label: string;
  /** Leading icon. */
  icon?: string;
  /** Trailing keyboard hint, e.g. `⌘C`; display only. */
  shortcut?: string;
};

export type MenuOption = MenuItemData & {
  value: string;
  disabled?: boolean;
};

// The row an item part belongs to; a TriggerItem is no Ark option, so its text cannot be Ark's ItemText.
const ItemContext = createContext<{ data: MenuItemData; trigger: boolean } | undefined>(undefined);

const useItem = (part: string) => {
  const context = useContext(ItemContext);
  if (!context) {
    throw new Error(`Next.Menu.${part} must be inside a Next.Menu item`);
  }
  return context;
};

/** An item part's row data comes from its caller, so a missing `item` names the part rather than failing deep inside it. */
const assertItem = (part: string, item: MenuItemData | undefined) =>
  invariant(item, `Next.Menu.${part} requires an \`item\``);

type MenuItemProps = ThemedClassName<Omit<MenuPrimitive.ItemProps, 'value' | 'children'>> & {
  item: MenuOption;
  /** Replaces the whole row, composed from `ItemIcon`, `ItemText`, `ItemShortcut` and any trailing control. */
  children?: ReactNode;
};

/** A block-tall row: without children, the option's leading icon, its label and its trailing shortcut. */
const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ classNames, item, disabled, children, ...props }, forwardedRef) => {
    assertItem('Item', item);
    return (
      <ItemContext.Provider value={{ data: item, trigger: false }}>
        <MenuPrimitive.Item
          {...props}
          value={item.value}
          disabled={disabled ?? item.disabled}
          className={mx(recipes.menuItem(), classNames)}
          ref={forwardedRef}
        >
          {children ?? (
            <>
              {item.icon && <MenuItemIcon />}
              <MenuItemText />
              {item.shortcut && <MenuItemShortcut />}
            </>
          )}
        </MenuPrimitive.Item>
      </ItemContext.Provider>
    );
  },
);

MenuItem.displayName = 'Next.Menu.Item';

//
// ItemIcon
//

type MenuItemIconProps = Omit<IconProps, 'icon'> & {
  /** Defaults to the item's `icon`. */
  icon?: string;
};

const MenuItemIcon = forwardRef<SVGSVGElement, MenuItemIconProps>(({ icon, ...props }, forwardedRef) => {
  const { data } = useItem('ItemIcon');
  const glyph = icon ?? data.icon;
  return glyph ? <Icon {...props} icon={glyph} ref={forwardedRef} /> : null;
});

MenuItemIcon.displayName = 'Next.Menu.ItemIcon';

//
// ItemText
//

type MenuItemTextProps = ThemedClassName<MenuPrimitive.ItemTextProps>;

/** The row's label, taking the free space and truncating; the item's `label` by default. */
const MenuItemText = forwardRef<HTMLDivElement, MenuItemTextProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { data, trigger } = useItem('ItemText');
    const className = mx(recipes.menuItemText(), classNames);
    return trigger ? (
      <div {...props} data-scope='menu' data-part='item-text' className={className} ref={forwardedRef}>
        {children ?? data.label}
      </div>
    ) : (
      <MenuPrimitive.ItemText {...props} className={className} ref={forwardedRef}>
        {children ?? data.label}
      </MenuPrimitive.ItemText>
    );
  },
);

MenuItemText.displayName = 'Next.Menu.ItemText';

//
// ItemShortcut
//

type MenuItemShortcutProps = ThemedClassName<ComponentPropsWithoutRef<'kbd'>>;

/** A trailing keyboard hint in the description colour, hidden from assistive tech; the item's `shortcut` by default. */
const MenuItemShortcut = forwardRef<HTMLElement, MenuItemShortcutProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { data } = useItem('ItemShortcut');
    return (
      <kbd
        aria-hidden
        {...props}
        data-scope='menu'
        data-part='item-shortcut'
        className={mx(recipes.menuShortcut(), classNames)}
        ref={forwardedRef}
      >
        {children ?? data.shortcut}
      </kbd>
    );
  },
);

MenuItemShortcut.displayName = 'Next.Menu.ItemShortcut';

//
// ItemIndicator
//

type MenuItemIndicatorProps = ThemedClassName<MenuPrimitive.ItemIndicatorProps>;

/**
 * The leading cell of a checkbox or radio item: icon-sized whether or not the item is checked, so labels align, and
 * showing a check by default while it is.
 */
const MenuItemIndicator = forwardRef<HTMLDivElement, MenuItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <MenuPrimitive.ItemIndicator
      aria-hidden
      // Kept in the layout while unchecked (styled by `data-state`), since preflight's `[hidden]` rule is `!important`.
      hidden={false}
      {...props}
      className={mx(recipes.menuIndicator(), classNames)}
      ref={forwardedRef}
    >
      {children ?? <Icon icon='ph--check--regular' />}
    </MenuPrimitive.ItemIndicator>
  ),
);

MenuItemIndicator.displayName = 'Next.Menu.ItemIndicator';

//
// CheckboxItem
//

type MenuCheckboxItemProps = ThemedClassName<Omit<MenuPrimitive.CheckboxItemProps, 'value' | 'children'>> & {
  item: MenuOption;
  /** Replaces the whole row, composed from `ItemIndicator`, `ItemText` and `ItemShortcut`. */
  children?: ReactNode;
};

/** A `menuitemcheckbox` row: without children, a check cell, the label and the shortcut; selecting it toggles `checked`. */
const MenuCheckboxItem = forwardRef<HTMLDivElement, MenuCheckboxItemProps>(
  ({ classNames, item, disabled, children, ...props }, forwardedRef) => {
    assertItem('CheckboxItem', item);
    return (
      <ItemContext.Provider value={{ data: item, trigger: false }}>
        <MenuPrimitive.CheckboxItem
          {...props}
          value={item.value}
          disabled={disabled ?? item.disabled}
          className={mx(recipes.menuItem(), classNames)}
          ref={forwardedRef}
        >
          {children ?? (
            <>
              <MenuItemIndicator />
              <MenuItemText />
              {item.shortcut && <MenuItemShortcut />}
            </>
          )}
        </MenuPrimitive.CheckboxItem>
      </ItemContext.Provider>
    );
  },
);

MenuCheckboxItem.displayName = 'Next.Menu.CheckboxItem';

//
// RadioItemGroup
//

type MenuRadioItemGroupProps = ThemedClassName<MenuPrimitive.RadioItemGroupProps>;

/** A group of radio items holding one `value`; name it with an `ItemGroupLabel` inside. */
const MenuRadioItemGroup = forwardRef<HTMLDivElement, MenuRadioItemGroupProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <MenuPrimitive.RadioItemGroup {...props} className={mx(classNames)} ref={forwardedRef} />
  ),
);

MenuRadioItemGroup.displayName = 'Next.Menu.RadioItemGroup';

//
// RadioItem
//

type MenuRadioItemProps = ThemedClassName<Omit<MenuPrimitive.RadioItemProps, 'value' | 'children'>> & {
  item: MenuOption;
  /** Replaces the whole row, composed from `ItemIndicator` and `ItemText`. */
  children?: ReactNode;
};

/** A `menuitemradio` row: without children, a dot in the indicator cell while it holds its group's value, and the label. */
const MenuRadioItem = forwardRef<HTMLDivElement, MenuRadioItemProps>(
  ({ classNames, item, disabled, children, ...props }, forwardedRef) => {
    assertItem('RadioItem', item);
    return (
      <ItemContext.Provider value={{ data: item, trigger: false }}>
        <MenuPrimitive.RadioItem
          {...props}
          value={item.value}
          disabled={disabled ?? item.disabled}
          className={mx(recipes.menuItem(), classNames)}
          ref={forwardedRef}
        >
          {children ?? (
            <>
              <MenuItemIndicator>
                <Icon icon='ph--dot-outline--fill' />
              </MenuItemIndicator>
              <MenuItemText />
            </>
          )}
        </MenuPrimitive.RadioItem>
      </ItemContext.Provider>
    );
  },
);

MenuRadioItem.displayName = 'Next.Menu.RadioItem';

//
// Sub
//

type MenuSubProps = MenuRootProps;

/**
 * A nested menu: a Root inside a parent's Content, opened by its `TriggerItem` and placed beside it. Ark reports a
 * nested item only to its own menu, so without an `onSelect` of its own a Sub forwards selections to its parent's.
 */
const MenuSub = ({ positioning, onSelect, ...props }: MenuSubProps) => {
  const parent = useContext(MenuContext);
  return (
    <MenuRootBase
      {...props}
      sub
      onSelect={onSelect ?? parent.onSelect}
      positioning={{ placement: 'right-start', gutter: 0, getAnchorRect: parentEdgeRect, ...positioning }}
    />
  );
};

/**
 * The trigger item's rect stretched to its menu's end edge, so a submenu opens beside the menu rather than over the
 * thumb strip an overflowing menu reserves after its items.
 */
const parentEdgeRect = (element: unknown) => {
  // A virtual anchor has no menu to measure, so zag falls back to its own rect.
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  const item = element.getBoundingClientRect();
  const frame = element.closest('.nx-popup')?.getBoundingClientRect();
  return { x: item.x, y: item.y, width: (frame?.right ?? item.right) - item.x, height: item.height };
};

MenuSub.displayName = 'Next.Menu.Sub';

//
// TriggerItem
//

type MenuTriggerItemProps = ThemedClassName<Omit<MenuPrimitive.TriggerItemProps, 'children'>> & {
  item: MenuItemData;
  /** Neither highlights nor opens its submenu. */
  disabled?: boolean;
  /** Replaces the whole row, composed from `ItemIcon`, `ItemText` and a trailing caret. */
  children?: ReactNode;
};

/** An item row that opens its `Menu.Sub` (hover, ArrowRight or Enter): without children, icon, label and a caret. */
const MenuTriggerItem = forwardRef<HTMLDivElement, MenuTriggerItemProps>(
  ({ classNames, item, disabled, children, onSelect, ...props }, forwardedRef) => {
    const value = useId();
    assertItem('TriggerItem', item);
    const row = children ?? (
      <>
        {item.icon && <MenuItemIcon />}
        <MenuItemText />
        <Icon icon='ph--caret-right--regular' />
      </>
    );

    // Ark's trigger item takes no `disabled`, so a disabled one is an inert item row and its submenu never opens.
    if (disabled) {
      return (
        <ItemContext.Provider value={{ data: item, trigger: false }}>
          <MenuPrimitive.Item
            {...props}
            value={value}
            disabled
            className={mx(recipes.menuItem(), classNames)}
            ref={forwardedRef}
          >
            {row}
          </MenuPrimitive.Item>
        </ItemContext.Provider>
      );
    }

    return (
      <ItemContext.Provider value={{ data: item, trigger: true }}>
        <MenuPrimitive.TriggerItem
          {...props}
          onSelect={onSelect}
          className={mx(recipes.menuItem(), classNames)}
          ref={forwardedRef}
        >
          {row}
        </MenuPrimitive.TriggerItem>
      </ItemContext.Provider>
    );
  },
);

MenuTriggerItem.displayName = 'Next.Menu.TriggerItem';

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
  ItemIcon: MenuItemIcon,
  ItemText: MenuItemText,
  ItemShortcut: MenuItemShortcut,
  ItemIndicator: MenuItemIndicator,
  CheckboxItem: MenuCheckboxItem,
  RadioItemGroup: MenuRadioItemGroup,
  RadioItem: MenuRadioItem,
  Sub: MenuSub,
  TriggerItem: MenuTriggerItem,
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
  MenuItemIconProps,
  MenuItemIndicatorProps,
  MenuItemProps,
  MenuItemShortcutProps,
  MenuItemTextProps,
  MenuRadioItemGroupProps,
  MenuRadioItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuSubProps,
  MenuTriggerItemProps,
  MenuTriggerProps,
};
