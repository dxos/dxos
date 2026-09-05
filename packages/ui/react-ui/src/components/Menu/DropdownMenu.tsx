//
// Copyright 2022 DXOS.org
//

// One menu machine serves dropdown, context and sub menus (`Menu.Trigger` for a dropdown,
// `Menu.ContextTrigger` for a context menu, a nested `Menu.Root` for a submenu). This file is the
// shared anatomy, exported as both the `DropdownMenu` and `ContextMenu` namespaces.

import { ark } from '@ark-ui/react/factory';
import { Menu as MenuPrimitive, useMenuContext as useMenuPrimitiveContext } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type ComponentPropsWithRef,
  type FC,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { composeEventHandlers, useComposedRefs, useControllableState } from '@dxos/react-hooks';

import { useElevationContext, useSafeCollisionPadding, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ColumnContext } from '../Column/ColumnContext';
import {
  CONTEXT_MENU_NAME,
  DROPDOWN_MENU_NAME,
  type MenuAlign,
  type MenuContentHandlers,
  type MenuPlacementOptions,
  MenuProvider,
  type MenuSelectHandler,
  type MenuSide,
  useMenuContext,
} from './DropdownMenuContext';

const toPlacement = (side: MenuSide, align: MenuAlign) => (align === 'center' ? side : (`${side}-${align}` as const));

/** Consumers hand the machine a per-side padding; it takes one number, so the widest side wins. */
const toOverflowPadding = (padding: { top: number; right: number; bottom: number; left: number }) =>
  Math.max(padding.top, padding.right, padding.bottom, padding.left);

//
// Root
//

type MenuRootProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accepted for compatibility: the machine neither traps focus nor locks scroll. */
  modal?: boolean;
};

type MenuRootImplProps = MenuRootProps & {
  name: string;
  /** Where content sits when it says nothing: below a trigger, beside a submenu's trigger item. */
  defaultSide: MenuSide;
  defaultAlign: MenuAlign;
};

/** Re-places open content when its requested placement changes; needs the machine's api. */
const MenuReposition = ({ open, positioning }: { open: boolean; positioning: Record<string, unknown> }) => {
  const menu = useMenuPrimitiveContext();
  const reposition = menu.reposition;
  useEffect(() => {
    if (open) {
      reposition(positioning);
    }
  }, [open, positioning, reposition]);
  return null;
};

const MenuRootImpl: FC<MenuRootImplProps> = ({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  name,
  defaultSide,
  defaultAlign,
}) => {
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });
  const contentId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const handlersRef = useRef<MenuContentHandlers>({});
  const [virtualAnchor, setVirtualAnchorState] = useState<RefObject<Element | null> | null>(null);
  const [placementOptions, setPlacement] = useState<MenuPlacementOptions>({});
  const setVirtualAnchor = useCallback((ref: RefObject<Element | null>) => {
    setVirtualAnchorState(ref);
    return () => setVirtualAnchorState((current) => (current === ref ? null : current));
  }, []);

  const {
    side = defaultSide,
    align = defaultAlign,
    sideOffset = 0,
    alignOffset,
    collisionPadding = 8,
    collisionBoundary,
    avoidCollisions = true,
  } = placementOptions;
  const safeCollisionPadding = useSafeCollisionPadding(collisionPadding);
  const overflowPadding = toOverflowPadding(safeCollisionPadding);

  // The closest annotated ancestor bounds the content.
  const boundary = useMemo(() => {
    const closest = triggerRef.current?.closest<HTMLElement>('[data-popover-collision-boundary]') ?? null;
    const given = Array.isArray(collisionBoundary) ? collisionBoundary : collisionBoundary ? [collisionBoundary] : [];
    const elements = [closest, ...given].filter((element): element is Element => !!element);
    return elements.length ? () => elements : undefined;
    // The trigger is read when the menu opens, which is when the boundary matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collisionBoundary]);

  const positioning = useMemo(
    () => ({
      strategy: 'fixed' as const,
      placement: toPlacement(side, align),
      gutter: sideOffset,
      ...(alignOffset !== undefined && { offset: { mainAxis: sideOffset, crossAxis: alignOffset } }),
      overflowPadding,
      // Keeps the arrow off the rounded corners, where its fill would paint over the curve.
      arrowPadding: 12,
      flip: avoidCollisions,
      boundary,
      ...(virtualAnchor && {
        getAnchorRect: () => virtualAnchor.current?.getBoundingClientRect() ?? null,
      }),
    }),
    [side, align, sideOffset, alignOffset, overflowPadding, avoidCollisions, boundary, virtualAnchor],
  );

  const context = useMemo(
    () => ({ open, onOpenChange: setOpen, triggerRef, setVirtualAnchor, setPlacement, handlersRef }),
    [open, setOpen, setVirtualAnchor],
  );

  return (
    <MenuPrimitive.Root
      open={open}
      onOpenChange={({ open: next }) => setOpen(next)}
      ids={{ content: contentId }}
      positioning={positioning}
      typeahead
      // Selection is the item's own click handler's business (see `useSelectableItem`), so the
      // machine neither closes nor reports it.
      closeOnSelect={false}
      onInteractOutside={(event) => handlersRef.current.onInteractOutside?.(event)}
      onPointerDownOutside={(event) => handlersRef.current.onPointerDownOutside?.(event)}
      onFocusOutside={(event) => handlersRef.current.onFocusOutside?.(event)}
      onEscapeKeyDown={(event) => handlersRef.current.onEscapeKeyDown?.(event)}
      // Closed content is not in the DOM at all.
      lazyMount
      unmountOnExit
    >
      <MenuReposition open={open} positioning={positioning} />
      <MenuProvider {...context}>{children}</MenuProvider>
    </MenuPrimitive.Root>
  );
};

const DropdownMenuRoot: FC<MenuRootProps> = (props) => (
  <MenuRootImpl {...props} name={DROPDOWN_MENU_NAME} defaultSide='bottom' defaultAlign='center' />
);

DropdownMenuRoot.displayName = DROPDOWN_MENU_NAME;

const ContextMenuRoot: FC<MenuRootProps> = (props) => (
  <MenuRootImpl {...props} name={CONTEXT_MENU_NAME} defaultSide='right' defaultAlign='start' />
);

ContextMenuRoot.displayName = CONTEXT_MENU_NAME;

//
// Trigger
//

const TRIGGER_NAME = 'DropdownMenu.Trigger';

type MenuTriggerProps = ComponentPropsWithRef<typeof MenuPrimitive.Trigger>;

const DropdownMenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>((props, forwardedRef) => {
  const { triggerRef } = useMenuContext(TRIGGER_NAME);
  return <MenuPrimitive.Trigger data-arrow-keys='down' {...props} ref={useComposedRefs(forwardedRef, triggerRef)} />;
});

DropdownMenuTrigger.displayName = TRIGGER_NAME;

const CONTEXT_TRIGGER_NAME = 'ContextMenu.Trigger';

type ContextMenuTriggerProps = ComponentPropsWithRef<typeof MenuPrimitive.ContextTrigger>;

const ContextMenuTrigger = forwardRef<HTMLButtonElement, ContextMenuTriggerProps>((props, forwardedRef) => {
  const { triggerRef } = useMenuContext(CONTEXT_TRIGGER_NAME);
  return <MenuPrimitive.ContextTrigger {...props} ref={useComposedRefs(forwardedRef, triggerRef)} />;
});

ContextMenuTrigger.displayName = CONTEXT_TRIGGER_NAME;

//
// VirtualTrigger
//

const VIRTUAL_TRIGGER_NAME = 'DropdownMenu.VirtualTrigger';

type MenuVirtualTriggerProps = {
  /** The element the content is positioned at and focus returns to; it renders nothing itself. */
  virtualRef: RefObject<Element | null>;
};

const MenuVirtualTrigger = ({ virtualRef }: MenuVirtualTriggerProps) => {
  const { setVirtualAnchor, triggerRef } = useMenuContext(VIRTUAL_TRIGGER_NAME);
  useLayoutEffect(() => setVirtualAnchor(virtualRef), [setVirtualAnchor, virtualRef]);
  useLayoutEffect(() => {
    const element = virtualRef.current;
    if (element instanceof HTMLElement) {
      triggerRef.current = element;
    }
  });
  return null;
};

MenuVirtualTrigger.displayName = VIRTUAL_TRIGGER_NAME;

//
// Portal
//

type MenuPortalProps = {
  children?: ReactNode;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
};

const MenuPortal = ({ children, container }: MenuPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return (
    <Portal container={containerRef}>
      {/* The portal escapes the declaring tree's DOM, but React context follows the element tree, so
          content declared inside a Column would otherwise place itself in a track no ancestor provides. */}
      <ColumnContext.Provider value={false}>{children}</ColumnContext.Provider>
    </Portal>
  );
};

MenuPortal.displayName = 'DropdownMenu.Portal';

//
// Content
//

const CONTENT_NAME = 'DropdownMenu.Content';

type MenuContentProps = ThemedClassName<ComponentPropsWithRef<typeof MenuPrimitive.Content>> &
  MenuPlacementOptions &
  MenuContentHandlers & {
    constrainBlockSize?: boolean;
  };

const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  (
    {
      classNames,
      children,
      side,
      align,
      sideOffset,
      alignOffset,
      collisionPadding,
      collisionBoundary,
      avoidCollisions,
      constrainBlockSize,
      onCloseAutoFocus,
      onInteractOutside,
      onPointerDownOutside,
      onFocusOutside,
      onEscapeKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    const { setPlacement, handlersRef } = useMenuContext(CONTENT_NAME);
    const { tx } = useThemeContext();
    const elevation = useElevationContext();

    // Placement is state on the root (it re-positions); the handlers are read at event time.
    useLayoutEffect(() => {
      setPlacement({ side, align, sideOffset, alignOffset, collisionPadding, collisionBoundary, avoidCollisions });
    }, [setPlacement, side, align, sideOffset, alignOffset, collisionPadding, collisionBoundary, avoidCollisions]);
    handlersRef.current = {
      onCloseAutoFocus,
      onInteractOutside,
      onPointerDownOutside,
      onFocusOutside,
      onEscapeKeyDown,
    };

    return (
      <MenuPrimitive.Positioner className={tx('menu.positioner', { elevation })}>
        <MenuPrimitive.Content
          data-arrow-keys='up down'
          {...props}
          className={tx('menu.content', { elevation, constrainBlockSize }, classNames)}
          ref={forwardedRef}
        >
          {children}
        </MenuPrimitive.Content>
      </MenuPrimitive.Positioner>
    );
  },
);

MenuContent.displayName = CONTENT_NAME;

//
// Viewport
//

type MenuViewportProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & {
  asChild?: boolean;
};

const MenuViewport = forwardRef<HTMLDivElement, MenuViewportProps>(
  ({ classNames, asChild, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.div asChild={asChild} {...props} className={tx('menu.viewport', {}, classNames)} ref={forwardedRef}>
        {children}
      </ark.div>
    );
  },
);

MenuViewport.displayName = 'DropdownMenu.Viewport';

//
// Group
//

type MenuGroupProps = ComponentPropsWithRef<typeof MenuPrimitive.ItemGroup>;

const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>((props, forwardedRef) => {
  return <MenuPrimitive.ItemGroup {...props} ref={forwardedRef} />;
});

MenuGroup.displayName = 'DropdownMenu.Group';

/** A heading over the entries that follow; a plain element, so it works inside a group or without one. */
type MenuGroupLabelProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>>;

const MenuGroupLabel = forwardRef<HTMLDivElement, MenuGroupLabelProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <ark.div {...props} className={tx('menu.groupLabel', {}, classNames)} ref={forwardedRef} />;
});

MenuGroupLabel.displayName = 'DropdownMenu.GroupLabel';

//
// Item
//

const ITEM_NAME = 'DropdownMenu.Item';

/**
 * Selection handled on the item's own click — which keyboard activation reaches too, since the
 * machine clicks the highlighted element on Enter. Not the machine's `onSelect`: that reads the
 * highlighted value from React-state-backed context, which a click landing before React commits
 * the pointerdown's highlight (a test does) finds empty. The contract: `onSelect` gets a
 * cancelable event and `preventDefault()` keeps the menu open.
 */
const useSelectableItem = (name: string, valueProp: string | undefined, onSelect: MenuSelectHandler | undefined) => {
  const { onOpenChange } = useMenuContext(name);
  const generatedValue = useId();
  const value = valueProp ?? generatedValue;
  const select = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.currentTarget.dataset.disabled !== undefined) {
        return;
      }
      const selection = new Event(`${name}.select`, { cancelable: true });
      onSelect?.(selection);
      if (!selection.defaultPrevented) {
        onOpenChange(false);
      }
    },
    [name, onSelect, onOpenChange],
  );
  return { value, select };
};

type MenuItemProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof MenuPrimitive.Item>, 'value' | 'onSelect'>> & {
  /** Identifies the item to the machine; generated when absent. */
  value?: string;
  /** Called on click or keyboard activation; `preventDefault()` keeps the menu open. */
  onSelect?: MenuSelectHandler;
  /** What typeahead matches when the item's text is not its label. */
  textValue?: string;
};

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ classNames, value: valueProp, onSelect, textValue, ...props }, forwardedRef) => {
    const { value, select } = useSelectableItem(ITEM_NAME, valueProp, onSelect);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.Item
        {...props}
        onClick={composeEventHandlers(props.onClick, select)}
        value={value}
        valueText={textValue}
        className={tx('menu.item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

MenuItem.displayName = ITEM_NAME;

//
// CheckboxItem
//

const CHECKBOX_ITEM_NAME = 'DropdownMenu.CheckboxItem';

type MenuCheckboxItemProps = ThemedClassName<
  Omit<ComponentPropsWithRef<typeof MenuPrimitive.CheckboxItem>, 'value' | 'checked' | 'onCheckedChange'>
> & {
  value?: string;
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: MenuSelectHandler;
  textValue?: string;
};

const MenuCheckboxItem = forwardRef<HTMLDivElement, MenuCheckboxItemProps>(
  ({ classNames, value: valueProp, checked, onCheckedChange, onSelect, textValue, ...props }, forwardedRef) => {
    const { value, select } = useSelectableItem(CHECKBOX_ITEM_NAME, valueProp, onSelect);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.CheckboxItem
        {...props}
        onClick={composeEventHandlers(props.onClick, select)}
        value={value}
        checked={checked === true}
        onCheckedChange={onCheckedChange}
        valueText={textValue}
        className={tx('menu.item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

MenuCheckboxItem.displayName = CHECKBOX_ITEM_NAME;

//
// RadioGroup / RadioItem
//

type MenuRadioGroupProps = Omit<ComponentPropsWithRef<typeof MenuPrimitive.RadioItemGroup>, 'onValueChange'> & {
  onValueChange?: (value: string) => void;
};

const MenuRadioGroup = forwardRef<HTMLDivElement, MenuRadioGroupProps>(({ onValueChange, ...props }, forwardedRef) => {
  return (
    <MenuPrimitive.RadioItemGroup
      {...props}
      onValueChange={onValueChange && (({ value }) => onValueChange(value))}
      ref={forwardedRef}
    />
  );
});

MenuRadioGroup.displayName = 'DropdownMenu.RadioGroup';

const RADIO_ITEM_NAME = 'DropdownMenu.RadioItem';

type MenuRadioItemProps = ThemedClassName<ComponentPropsWithRef<typeof MenuPrimitive.RadioItem>> & {
  onSelect?: MenuSelectHandler;
  textValue?: string;
};

const MenuRadioItem = forwardRef<HTMLDivElement, MenuRadioItemProps>(
  ({ classNames, value, onSelect, textValue, ...props }, forwardedRef) => {
    const { select } = useSelectableItem(RADIO_ITEM_NAME, value, onSelect);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.RadioItem
        {...props}
        onClick={composeEventHandlers(props.onClick, select)}
        value={value}
        valueText={textValue}
        className={tx('menu.item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

MenuRadioItem.displayName = RADIO_ITEM_NAME;

//
// ItemIndicator
//

type MenuItemIndicatorProps = ComponentPropsWithRef<typeof MenuPrimitive.ItemIndicator>;

const MenuItemIndicator = forwardRef<HTMLDivElement, MenuItemIndicatorProps>((props, forwardedRef) => {
  return <MenuPrimitive.ItemIndicator {...props} ref={forwardedRef} />;
});

MenuItemIndicator.displayName = 'DropdownMenu.ItemIndicator';

//
// Separator
//

type MenuSeparatorProps = ThemedClassName<ComponentPropsWithRef<typeof MenuPrimitive.Separator>>;

const MenuSeparator = forwardRef<HTMLHRElement, MenuSeparatorProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <MenuPrimitive.Separator {...props} className={tx('menu.separator', {}, classNames)} ref={forwardedRef} />;
});

MenuSeparator.displayName = 'DropdownMenu.Separator';

//
// Arrow
//

type MenuArrowProps = ThemedClassName<ComponentPropsWithRef<typeof MenuPrimitive.Arrow>>;

const MenuArrow = forwardRef<HTMLDivElement, MenuArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <MenuPrimitive.Arrow {...props} className={tx('menu.arrow', {}, classNames)} ref={forwardedRef}>
      <MenuPrimitive.ArrowTip />
    </MenuPrimitive.Arrow>
  );
});

MenuArrow.displayName = 'DropdownMenu.Arrow';

//
// Sub
//

const SUB_NAME = 'DropdownMenu.Sub';

type MenuSubProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** A nested root; the machine links it to the parent it is rendered under. */
const MenuSub: FC<MenuSubProps> = (props) => (
  <MenuRootImpl {...props} name={SUB_NAME} defaultSide='right' defaultAlign='start' />
);

MenuSub.displayName = SUB_NAME;

type MenuSubTriggerProps = ThemedClassName<ComponentPropsWithRef<typeof MenuPrimitive.TriggerItem>>;

const MenuSubTrigger = forwardRef<HTMLDivElement, MenuSubTriggerProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <MenuPrimitive.TriggerItem {...props} className={tx('menu.item', {}, classNames)} ref={forwardedRef} />;
});

MenuSubTrigger.displayName = 'DropdownMenu.SubTrigger';

//
// Namespaces
//

export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  VirtualTrigger: MenuVirtualTrigger,
  Portal: MenuPortal,
  Content: MenuContent,
  Viewport: MenuViewport,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  Label: MenuGroupLabel,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  ItemIndicator: MenuItemIndicator,
  Separator: MenuSeparator,
  Arrow: MenuArrow,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuContent,
};

export const ContextMenu = {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Portal: MenuPortal,
  Content: MenuContent,
  Viewport: MenuViewport,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  Label: MenuGroupLabel,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  ItemIndicator: MenuItemIndicator,
  Separator: MenuSeparator,
  Arrow: MenuArrow,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuContent,
};

export type {
  MenuCheckboxItemProps as ContextMenuCheckboxItemProps,
  MenuContentProps as ContextMenuContentProps,
  MenuItemProps as ContextMenuItemProps,
  MenuRadioItemProps as ContextMenuRadioItemProps,
  MenuRootProps as ContextMenuRootProps,
  MenuSeparatorProps as ContextMenuSeparatorProps,
  ContextMenuTriggerProps,
  MenuViewportProps as ContextMenuViewportProps,
  MenuArrowProps as DropdownMenuArrowProps,
  MenuCheckboxItemProps as DropdownMenuCheckboxItemProps,
  MenuContentProps as DropdownMenuContentProps,
  MenuGroupProps as DropdownMenuGroupProps,
  MenuItemIndicatorProps as DropdownMenuItemIndicatorProps,
  MenuItemProps as DropdownMenuItemProps,
  MenuGroupLabelProps as DropdownMenuLabelProps,
  MenuPortalProps as DropdownMenuPortalProps,
  MenuRadioGroupProps as DropdownMenuRadioGroupProps,
  MenuRadioItemProps as DropdownMenuRadioItemProps,
  MenuRootProps as DropdownMenuRootProps,
  MenuSeparatorProps as DropdownMenuSeparatorProps,
  MenuContentProps as DropdownMenuSubContentProps,
  MenuSubProps as DropdownMenuSubProps,
  MenuSubTriggerProps as DropdownMenuSubTriggerProps,
  MenuTriggerProps as DropdownMenuTriggerProps,
  MenuViewportProps as DropdownMenuViewportProps,
  MenuVirtualTriggerProps as DropdownMenuVirtualTriggerProps,
};
