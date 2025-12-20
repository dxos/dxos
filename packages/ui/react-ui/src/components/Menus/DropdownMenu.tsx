//
// Copyright 2024 DXOS.org
//

// This is based upon `@radix-ui/react-dropdown-menu` fetched 25 Oct 2024 at https://github.com/radix-ui/primitives at commit 06de2d4.

import { composeEventHandlers } from '@radix-ui/primitive';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { createContextScope } from '@radix-ui/react-context';
import type { Scope } from '@radix-ui/react-context';
import { useId } from '@radix-ui/react-id';
import * as MenuPrimitive from '@radix-ui/react-menu';
import { createMenuScope } from '@radix-ui/react-menu';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type FC,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { useElevationContext, useThemeContext } from '../../hooks';
import { useSafeCollisionPadding } from '../../hooks/useSafeCollisionPadding';
import { type ThemedClassName } from '../../util';

type Direction = 'ltr' | 'rtl';

/* -------------------------------------------------------------------------------------------------
 * DropdownMenu
 * ----------------------------------------------------------------------------------------------- */

const DROPDOWN_MENU_NAME = 'DropdownMenu';

type ScopedProps<P> = P & { __scopeDropdownMenu?: Scope };
const [createDropdownMenuContext, createDropdownMenuScope] = createContextScope(DROPDOWN_MENU_NAME, [createMenuScope]);
const useMenuScope: (scope?: Scope) => any = createMenuScope();

type DropdownMenuContextValue = {
  triggerId: string;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  contentId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpenToggle(): void;
  modal: boolean;
};

const [DropdownMenuProvider, useDropdownMenuContext] =
  createDropdownMenuContext<DropdownMenuContextValue>(DROPDOWN_MENU_NAME);

interface DropdownMenuRootProps {
  children?: ReactNode;
  dir?: Direction;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  modal?: boolean;
}

const DropdownMenuRoot: FC<DropdownMenuRootProps> = (props: ScopedProps<DropdownMenuRootProps>) => {
  const { __scopeDropdownMenu, children, dir, open: openParam, defaultOpen, onOpenChange, modal = true } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open = false, setOpen] = useControllableState({
    prop: openParam,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <DropdownMenuProvider
      scope={__scopeDropdownMenu}
      triggerId={useId()}
      triggerRef={triggerRef as MutableRefObject<HTMLButtonElement | null>}
      contentId={useId()}
      open={open}
      onOpenChange={setOpen}
      onOpenToggle={useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen])}
      modal={modal}
    >
      <MenuPrimitive.Root {...menuScope} open={open} onOpenChange={setOpen} dir={dir} modal={modal}>
        {children}
      </MenuPrimitive.Root>
    </DropdownMenuProvider>
  );
};

DropdownMenuRoot.displayName = DROPDOWN_MENU_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuTrigger
 * ----------------------------------------------------------------------------------------------- */

const TRIGGER_NAME = 'DropdownMenuTrigger';

type DropdownMenuTriggerElement = ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;
interface DropdownMenuTriggerProps extends PrimitiveButtonProps {}

const DropdownMenuTrigger = forwardRef<DropdownMenuTriggerElement, DropdownMenuTriggerProps>(
  (props: ScopedProps<DropdownMenuTriggerProps>, forwardedRef) => {
    const { __scopeDropdownMenu, disabled = false, ...triggerProps } = props;
    const context = useDropdownMenuContext(TRIGGER_NAME, __scopeDropdownMenu);
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return (
      <MenuPrimitive.Anchor asChild {...menuScope}>
        <Primitive.button
          type='button'
          id={context.triggerId}
          aria-haspopup='menu'
          aria-expanded={context.open}
          aria-controls={context.open ? context.contentId : undefined}
          data-state={context.open ? 'open' : 'closed'}
          data-disabled={disabled ? '' : undefined}
          disabled={disabled}
          {...triggerProps}
          ref={composeRefs(forwardedRef, context.triggerRef)}
          data-arrow-keys='down'
          onPointerDown={composeEventHandlers(props.onPointerDown, (event) => {
            // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
            // but not when the control key is pressed (avoiding MacOS right click)
            if (!disabled && event.button === 0 && event.ctrlKey === false) {
              context.onOpenToggle();
              // prevent trigger focusing when opening
              // this allows the content to be given focus without competition
              if (!context.open) {
                event.preventDefault();
              }
            }
          })}
          onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
            if (disabled) {
              return;
            }
            if (['Enter', ' '].includes(event.key)) {
              context.onOpenToggle();
            }
            if (event.key === 'ArrowDown') {
              context.onOpenChange(true);
            }
            // prevent keydown from scrolling window / first focused item to execute
            // that keydown (inadvertently closing the menu)
            if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
              event.preventDefault();
            }
          })}
        />
      </MenuPrimitive.Anchor>
    );
  },
);

DropdownMenuTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuVirtualTrigger
 * ----------------------------------------------------------------------------------------------- */

const VIRTUAL_TRIGGER_NAME = 'DropdownMenuVirtualTrigger';

interface DropdownMenuVirtualTriggerProps {
  virtualRef: RefObject<DropdownMenuTriggerElement | null>;
}

const DropdownMenuVirtualTrigger = (props: ScopedProps<DropdownMenuVirtualTriggerProps>) => {
  const { __scopeDropdownMenu, virtualRef } = props;
  const context = useDropdownMenuContext(VIRTUAL_TRIGGER_NAME, __scopeDropdownMenu);
  const menuScope = useMenuScope(__scopeDropdownMenu);
  useEffect(() => {
    if (virtualRef.current) {
      context.triggerRef.current = virtualRef.current;
    }
  });
  return <MenuPrimitive.Anchor {...menuScope} virtualRef={virtualRef as RefObject<DropdownMenuTriggerElement>} />;
};

DropdownMenuVirtualTrigger.displayName = VIRTUAL_TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuPortal
 * ----------------------------------------------------------------------------------------------- */

const PORTAL_NAME = 'DropdownMenuPortal';

type MenuPortalProps = ComponentPropsWithoutRef<typeof MenuPrimitive.Portal>;
interface DropdownMenuPortalProps extends MenuPortalProps {}

const DropdownMenuPortal: FC<DropdownMenuPortalProps> = (props: ScopedProps<DropdownMenuPortalProps>) => {
  const { __scopeDropdownMenu, ...portalProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return <MenuPrimitive.Portal {...menuScope} {...portalProps} />;
};

DropdownMenuPortal.displayName = PORTAL_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuViewport
 * ----------------------------------------------------------------------------------------------- */

type DropdownMenuViewportProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
};

const DropdownMenuViewport = forwardRef<HTMLDivElement, DropdownMenuViewportProps>(
  ({ classNames, asChild, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root {...props} className={tx('menu.viewport', 'menu__viewport', {}, classNames)} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuContent
 * ----------------------------------------------------------------------------------------------- */

const CONTENT_NAME = 'DropdownMenuContent';

type DropdownMenuContentElement = ElementRef<typeof MenuPrimitive.Content>;
type MenuContentProps = ThemedClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.Content>>;
interface DropdownMenuContentProps extends Omit<MenuContentProps, 'onEntryFocus'> {}

const DropdownMenuContent = forwardRef<DropdownMenuContentElement, DropdownMenuContentProps>(
  (props: ScopedProps<DropdownMenuContentProps>, forwardedRef) => {
    const { __scopeDropdownMenu, classNames, collisionPadding = 8, collisionBoundary, ...contentProps } = props;
    const { tx } = useThemeContext();
    const context = useDropdownMenuContext(CONTENT_NAME, __scopeDropdownMenu);
    const elevation = useElevationContext();
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const hasInteractedOutsideRef = useRef(false);
    const safeCollisionPadding = useSafeCollisionPadding(collisionPadding);

    // Check for the closest annotated collision boundary in the DOM tree.
    const computedCollisionBoundary = useMemo(() => {
      const closestBoundary = context.triggerRef.current?.closest(
        '[data-popover-collision-boundary]',
      ) as HTMLElement | null;
      return closestBoundary
        ? Array.isArray(collisionBoundary)
          ? [closestBoundary, ...collisionBoundary]
          : collisionBoundary
            ? [closestBoundary, collisionBoundary]
            : [closestBoundary]
        : collisionBoundary;
    }, [context.open, collisionBoundary, context.triggerRef.current]);

    return (
      <MenuPrimitive.Content
        id={context.contentId}
        aria-labelledby={context.triggerId}
        {...menuScope}
        {...contentProps}
        collisionBoundary={computedCollisionBoundary}
        collisionPadding={safeCollisionPadding}
        ref={forwardedRef}
        onCloseAutoFocus={composeEventHandlers(props.onCloseAutoFocus, (event) => {
          if (!hasInteractedOutsideRef.current) {
            context.triggerRef.current?.focus();
          }
          hasInteractedOutsideRef.current = false;
          // Always prevent auto focus because we either focus manually or want user agent focus
          event.preventDefault();
        })}
        onInteractOutside={composeEventHandlers(props.onInteractOutside, (event) => {
          const originalEvent = event.detail.originalEvent as PointerEvent;
          const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
          const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
          if (!context.modal || isRightClick) {
            hasInteractedOutsideRef.current = true;
          }
        })}
        data-arrow-keys='up down'
        className={tx('menu.content', 'menu', { elevation }, classNames)}
        style={{
          ...props.style,
          // re-namespace exposed content custom properties
          ...{
            '--radix-dropdown-menu-content-transform-origin': 'var(--radix-popper-transform-origin)',
            '--radix-dropdown-menu-content-available-width': 'var(--radix-popper-available-width)',
            '--radix-dropdown-menu-content-available-height': 'var(--radix-popper-available-height)',
            '--radix-dropdown-menu-trigger-width': 'var(--radix-popper-anchor-width)',
            '--radix-dropdown-menu-trigger-height': 'var(--radix-popper-anchor-height)',
          },
        }}
      />
    );
  },
);

DropdownMenuContent.displayName = CONTENT_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuGroup
 * ----------------------------------------------------------------------------------------------- */

const GROUP_NAME = 'DropdownMenuGroup';

type DropdownMenuGroupElement = ElementRef<typeof MenuPrimitive.Group>;
type MenuGroupProps = ComponentPropsWithoutRef<typeof MenuPrimitive.Group>;
interface DropdownMenuGroupProps extends MenuGroupProps {}

const DropdownMenuGroup = forwardRef<DropdownMenuGroupElement, DropdownMenuGroupProps>(
  (props: ScopedProps<DropdownMenuGroupProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...groupProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.Group {...menuScope} {...groupProps} ref={forwardedRef} />;
  },
);

DropdownMenuGroup.displayName = GROUP_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuLabel
 * ----------------------------------------------------------------------------------------------- */

const LABEL_NAME = 'DropdownMenuLabel';

type DropdownMenuLabelElement = ElementRef<typeof MenuPrimitive.Label>;
type MenuLabelProps = ThemedClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.Label>>;
interface DropdownMenuLabelProps extends MenuLabelProps {}

const DropdownMenuGroupLabel = forwardRef<DropdownMenuLabelElement, DropdownMenuLabelProps>(
  (props: ScopedProps<DropdownMenuLabelProps>, forwardedRef) => {
    const { __scopeDropdownMenu, classNames, ...labelProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.Label
        {...menuScope}
        {...labelProps}
        className={tx('menu.groupLabel', 'menu__group__label', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

DropdownMenuGroupLabel.displayName = LABEL_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuItem
 * ----------------------------------------------------------------------------------------------- */

const ITEM_NAME = 'DropdownMenuItem';

type DropdownMenuItemElement = ElementRef<typeof MenuPrimitive.Item>;
type MenuItemProps = ThemedClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.Item>>;
interface DropdownMenuItemProps extends MenuItemProps {}

const DropdownMenuItem = forwardRef<DropdownMenuItemElement, DropdownMenuItemProps>(
  (props: ScopedProps<DropdownMenuItemProps>, forwardedRef) => {
    const { __scopeDropdownMenu, classNames, ...itemProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.Item
        {...menuScope}
        {...itemProps}
        className={tx('menu.item', 'menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

DropdownMenuItem.displayName = ITEM_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuCheckboxItem
 * ----------------------------------------------------------------------------------------------- */

const CHECKBOX_ITEM_NAME = 'DropdownMenuCheckboxItem';

type DropdownMenuCheckboxItemElement = ElementRef<typeof MenuPrimitive.CheckboxItem>;
type MenuCheckboxItemProps = ThemedClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>>;
interface DropdownMenuCheckboxItemProps extends MenuCheckboxItemProps {}

const DropdownMenuCheckboxItem = forwardRef<DropdownMenuCheckboxItemElement, DropdownMenuCheckboxItemProps>(
  (props: ScopedProps<DropdownMenuCheckboxItemProps>, forwardedRef) => {
    const { __scopeDropdownMenu, classNames, ...checkboxItemProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.CheckboxItem
        {...menuScope}
        {...checkboxItemProps}
        className={tx('menu.item', 'menu__item--checkbox', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

DropdownMenuCheckboxItem.displayName = CHECKBOX_ITEM_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuRadioGroup
 * ----------------------------------------------------------------------------------------------- */

const RADIO_GROUP_NAME = 'DropdownMenuRadioGroup';

type DropdownMenuRadioGroupElement = ElementRef<typeof MenuPrimitive.RadioGroup>;
type MenuRadioGroupProps = ComponentPropsWithoutRef<typeof MenuPrimitive.RadioGroup>;
interface DropdownMenuRadioGroupProps extends MenuRadioGroupProps {}

const DropdownMenuRadioGroup = forwardRef<DropdownMenuRadioGroupElement, DropdownMenuRadioGroupProps>(
  (props: ScopedProps<DropdownMenuRadioGroupProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...radioGroupProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.RadioGroup {...menuScope} {...radioGroupProps} ref={forwardedRef} />;
  },
);

DropdownMenuRadioGroup.displayName = RADIO_GROUP_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuRadioItem
 * ----------------------------------------------------------------------------------------------- */

const RADIO_ITEM_NAME = 'DropdownMenuRadioItem';

type DropdownMenuRadioItemElement = ElementRef<typeof MenuPrimitive.RadioItem>;
type MenuRadioItemProps = ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>;
type DropdownMenuRadioItemProps = ThemedClassName<MenuRadioItemProps>;

const DropdownMenuRadioItem = forwardRef<DropdownMenuRadioItemElement, DropdownMenuRadioItemProps>(
  (props: ScopedProps<DropdownMenuRadioItemProps>, forwardedRef) => {
    const { __scopeDropdownMenu, classNames, ...itemProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.Item
        {...menuScope}
        {...itemProps}
        className={tx('menu.item', 'menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

DropdownMenuRadioItem.displayName = RADIO_ITEM_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuItemIndicator
 * ----------------------------------------------------------------------------------------------- */

const INDICATOR_NAME = 'DropdownMenuItemIndicator';

type DropdownMenuItemIndicatorElement = ElementRef<typeof MenuPrimitive.ItemIndicator>;
type MenuItemIndicatorProps = ComponentPropsWithoutRef<typeof MenuPrimitive.ItemIndicator>;
interface DropdownMenuItemIndicatorProps extends MenuItemIndicatorProps {}

const DropdownMenuItemIndicator = forwardRef<DropdownMenuItemIndicatorElement, DropdownMenuItemIndicatorProps>(
  (props: ScopedProps<DropdownMenuItemIndicatorProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...itemIndicatorProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.ItemIndicator {...menuScope} {...itemIndicatorProps} ref={forwardedRef} />;
  },
);

DropdownMenuItemIndicator.displayName = INDICATOR_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSeparator
 * ----------------------------------------------------------------------------------------------- */

const SEPARATOR_NAME = 'DropdownMenuSeparator';

type DropdownMenuSeparatorElement = ElementRef<typeof MenuPrimitive.Separator>;
type MenuSeparatorProps = ThemedClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>>;
interface DropdownMenuSeparatorProps extends MenuSeparatorProps {}

const DropdownMenuSeparator = forwardRef<DropdownMenuSeparatorElement, DropdownMenuSeparatorProps>(
  (props: ScopedProps<DropdownMenuSeparatorProps>, forwardedRef) => {
    const { __scopeDropdownMenu, classNames, ...separatorProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.Separator
        {...menuScope}
        {...separatorProps}
        className={tx('menu.separator', 'menu__item', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

DropdownMenuSeparator.displayName = SEPARATOR_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuArrow
 * ----------------------------------------------------------------------------------------------- */

const ARROW_NAME = 'DropdownMenuArrow';

type DropdownMenuArrowElement = ElementRef<typeof MenuPrimitive.Arrow>;
type MenuArrowProps = ThemedClassName<ComponentPropsWithoutRef<typeof MenuPrimitive.Arrow>>;
interface DropdownMenuArrowProps extends MenuArrowProps {}

const DropdownMenuArrow = forwardRef<DropdownMenuArrowElement, DropdownMenuArrowProps>(
  (props: ScopedProps<DropdownMenuArrowProps>, forwardedRef) => {
    const { __scopeDropdownMenu, classNames, ...arrowProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const { tx } = useThemeContext();
    return (
      <MenuPrimitive.Arrow
        {...menuScope}
        {...arrowProps}
        className={tx('menu.arrow', 'menu__arrow', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

DropdownMenuArrow.displayName = ARROW_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSub
 * ----------------------------------------------------------------------------------------------- */

interface DropdownMenuSubProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
}

const DropdownMenuSub: FC<DropdownMenuSubProps> = (props: ScopedProps<DropdownMenuSubProps>) => {
  const { __scopeDropdownMenu, children, open: openParam, onOpenChange, defaultOpen } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  const [open = false, setOpen] = useControllableState({
    prop: openParam,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <MenuPrimitive.Sub {...menuScope} open={open} onOpenChange={setOpen}>
      {children}
    </MenuPrimitive.Sub>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSubTrigger
 * ----------------------------------------------------------------------------------------------- */

const SUB_TRIGGER_NAME = 'DropdownMenuSubTrigger';

type DropdownMenuSubTriggerElement = ElementRef<typeof MenuPrimitive.SubTrigger>;
type MenuSubTriggerProps = ComponentPropsWithoutRef<typeof MenuPrimitive.SubTrigger>;
interface DropdownMenuSubTriggerProps extends MenuSubTriggerProps {}

const DropdownMenuSubTrigger = forwardRef<DropdownMenuSubTriggerElement, DropdownMenuSubTriggerProps>(
  (props: ScopedProps<DropdownMenuSubTriggerProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...subTriggerProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return <MenuPrimitive.SubTrigger {...menuScope} {...subTriggerProps} ref={forwardedRef} />;
  },
);

DropdownMenuSubTrigger.displayName = SUB_TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSubContent
 * ----------------------------------------------------------------------------------------------- */

const SUB_CONTENT_NAME = 'DropdownMenuSubContent';

type DropdownMenuSubContentElement = ElementRef<typeof MenuPrimitive.Content>;
type MenuSubContentProps = ComponentPropsWithoutRef<typeof MenuPrimitive.SubContent>;
interface DropdownMenuSubContentProps extends MenuSubContentProps {}

const DropdownMenuSubContent = forwardRef<DropdownMenuSubContentElement, DropdownMenuSubContentProps>(
  (props: ScopedProps<DropdownMenuSubContentProps>, forwardedRef) => {
    const { __scopeDropdownMenu, ...subContentProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);

    return (
      <MenuPrimitive.SubContent
        {...menuScope}
        {...subContentProps}
        ref={forwardedRef}
        style={{
          ...props.style,
          // re-namespace exposed content custom properties
          ...{
            '--radix-dropdown-menu-content-transform-origin': 'var(--radix-popper-transform-origin)',
            '--radix-dropdown-menu-content-available-width': 'var(--radix-popper-available-width)',
            '--radix-dropdown-menu-content-available-height': 'var(--radix-popper-available-height)',
            '--radix-dropdown-menu-trigger-width': 'var(--radix-popper-anchor-width)',
            '--radix-dropdown-menu-trigger-height': 'var(--radix-popper-anchor-height)',
          },
        }}
      />
    );
  },
);

DropdownMenuSubContent.displayName = SUB_CONTENT_NAME;

/* ----------------------------------------------------------------------------------------------- */

export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  VirtualTrigger: DropdownMenuVirtualTrigger,
  Portal: DropdownMenuPortal,
  Content: DropdownMenuContent,
  Viewport: DropdownMenuViewport,
  Group: DropdownMenuGroup,
  GroupLabel: DropdownMenuGroupLabel,
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  ItemIndicator: DropdownMenuItemIndicator,
  Separator: DropdownMenuSeparator,
  Arrow: DropdownMenuArrow,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};

type DropdownMenuScope = Scope;

const useDropdownMenuMenuScope: (scope?: DropdownMenuScope) => any = useMenuScope;

export { createDropdownMenuScope, useDropdownMenuContext, useDropdownMenuMenuScope };

export type {
  DropdownMenuRootProps,
  DropdownMenuTriggerProps,
  DropdownMenuVirtualTriggerProps,
  DropdownMenuPortalProps,
  DropdownMenuContentProps,
  DropdownMenuViewportProps,
  DropdownMenuGroupProps,
  DropdownMenuLabelProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
  DropdownMenuItemIndicatorProps,
  DropdownMenuSeparatorProps,
  DropdownMenuArrowProps,
  DropdownMenuSubProps,
  DropdownMenuSubTriggerProps,
  DropdownMenuSubContentProps,
};
