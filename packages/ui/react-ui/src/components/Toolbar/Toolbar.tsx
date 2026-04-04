//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import type { ToggleGroupItemProps as ToggleGroupItemPrimitiveProps } from '@radix-ui/react-toggle-group';
import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { composable, composableProps, slottable, type ToolbarStyleProps } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { translationKey } from '../../translations';

import {
  Button,
  ButtonGroup,
  type ButtonGroupProps,
  type ButtonProps,
  IconButton,
  type IconButtonProps,
  Toggle,
  type ToggleGroupItemProps,
  type ToggleProps,
} from '../Button';
import { Link, type LinkProps } from '../Link';
import { DropdownMenu } from '../Menu';
import { Separator, type SeparatorProps } from '../Separator';

//
// Root
//

type ToolbarRootProps = ToolbarPrimitive.ToolbarProps & ToolbarStyleProps;

const ToolbarRoot = composable<HTMLDivElement, ToolbarRootProps>(
  ({ children, density, disabled, layoutManaged, orientation, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const { tx } = useThemeContext();

    return (
      <ToolbarPrimitive.Root
        {...rest}
        orientation={orientation}
        data-arrow-keys={orientation === 'vertical' ? 'up down' : 'left right'}
        className={tx('toolbar.root', { density, disabled, layoutManaged }, className)}
        ref={forwardedRef}
      >
        {children}
      </ToolbarPrimitive.Root>
    );
  },
);

//
// Text
//

type ToolbarTextProps = SlottableProps;

const ToolbarText = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  const { tx } = useThemeContext();
  return (
    <Comp {...rest} className={tx('toolbar.text', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

//
// Button
//

type ToolbarButtonProps = ButtonProps;

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Button asChild>
      <Button {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Button>
  );
});

//
// IconButton
//

type ToolbarIconButtonProps = IconButtonProps;

const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Button asChild>
      <IconButton {...props} noTooltip ref={forwardedRef} />
    </ToolbarPrimitive.Button>
  );
});

type ToolbarToggleProps = ToggleProps;

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Button asChild>
      <Toggle {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Button>
  );
});

//
// Link
//

type ToolbarLinkProps = LinkProps;

const ToolbarLink = forwardRef<HTMLAnchorElement, ToolbarLinkProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Link asChild>
      <Link {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Link>
  );
});

type ToolbarToggleGroupProps = (
  | Omit<ToolbarPrimitive.ToolbarToggleGroupSingleProps, 'className'>
  | Omit<ToolbarPrimitive.ToolbarToggleGroupMultipleProps, 'className'>
) &
  ButtonGroupProps;

//
// ToggleGroup
//

const ToolbarToggleGroup = forwardRef<HTMLDivElement, ToolbarToggleGroupProps>(
  ({ classNames, children, elevation, ...props }, forwardedRef) => {
    return (
      <ToolbarPrimitive.ToolbarToggleGroup {...props} asChild>
        <ButtonGroup {...{ classNames, children, elevation }} ref={forwardedRef} />
      </ToolbarPrimitive.ToolbarToggleGroup>
    );
  },
);

type ToolbarToggleGroupItemProps = ToggleGroupItemProps;

const ToolbarToggleGroupItem = forwardRef<HTMLButtonElement, ToolbarToggleGroupItemProps>(
  ({ variant, density, elevation, classNames, children, ...props }, forwardedRef) => {
    return (
      <ToolbarPrimitive.ToolbarToggleItem {...props} asChild>
        <Button {...{ variant, density, elevation, classNames, children }} ref={forwardedRef} />
      </ToolbarPrimitive.ToolbarToggleItem>
    );
  },
);

type ToolbarToggleGroupIconItemProps = Omit<ToggleGroupItemPrimitiveProps, 'className'> & IconButtonProps;

const ToolbarToggleGroupIconItem = forwardRef<HTMLButtonElement, ToolbarToggleGroupIconItemProps>(
  ({ variant, density, elevation, classNames, icon, label, iconOnly, ...props }, forwardedRef) => {
    return (
      <ToolbarPrimitive.ToolbarToggleItem {...props} asChild>
        <IconButton
          {...{
            variant,
            density,
            elevation,
            classNames,
            icon,
            label,
            iconOnly,
          }}
          ref={forwardedRef}
        />
      </ToolbarPrimitive.ToolbarToggleItem>
    );
  },
);

//
// Separator
//

type ToolbarSeparatorProps = SeparatorProps & { variant?: 'gap' | 'line' };

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ variant = 'gap', ...props }, forwardedRef) => {
    return variant === 'line' ? (
      <ToolbarPrimitive.Separator asChild>
        <Separator {...props} ref={forwardedRef} />
      </ToolbarPrimitive.Separator>
    ) : (
      <ToolbarPrimitive.Separator className='grow' ref={forwardedRef} />
    );
  },
);

//
// DragHandle
//

type ToolbarDragHandleProps = { testId?: string; label?: string };

const ToolbarDragHandle = forwardRef<HTMLButtonElement, ToolbarDragHandleProps>(
  ({ testId = 'drag-handle', label }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <ToolbarIconButton
        data-testid={testId}
        tabIndex={-1}
        noTooltip
        iconOnly
        icon='ph--dots-six-vertical--regular'
        variant='ghost'
        label={label ?? t('toolbar-drag-handle.label')}
        classNames='dx-focus-ring-none cursor-pointer'
        disabled={!forwardedRef}
        ref={forwardedRef}
      />
    );
  },
);

//
// CloseIconButton
//

type ToolbarCloseIconButtonProps = { onClick?: () => void; label?: string };

const ToolbarCloseIconButton = forwardRef<HTMLButtonElement, ToolbarCloseIconButtonProps>(
  ({ onClick, label }, forwardedRef) => {
    const { t } = useTranslation(translationKey);

    return (
      <ToolbarIconButton
        iconOnly
        icon='ph--x--regular'
        variant='ghost'
        label={label ?? t('toolbar-close.label')}
        classNames='cursor-pointer'
        onClick={onClick}
        ref={forwardedRef}
      />
    );
  },
);

//
// Menu
//

type ToolbarMenuItem<T extends any | void = void> = {
  label: string;
  onClick: (context: T) => void;
};

type ToolbarMenuProps<T extends any | void = void> = {
  context?: T;
  items?: ToolbarMenuItem<T>[];
};

// TODO(burdon): Make slottable.
const ToolbarMenu = <T extends any | void = void>({ context, items }: ToolbarMenuProps<T>) => {
  const { t } = useTranslation(translationKey);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={!items?.length} asChild>
        <ToolbarIconButton
          iconOnly
          variant='ghost'
          icon='ph--dots-three-vertical--regular'
          label={t('toolbar-menu.label')}
        />
      </DropdownMenu.Trigger>
      {(items?.length ?? 0) > 0 && (
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {items?.map(({ label, onClick: onSelect }, index) => (
                <DropdownMenu.Item key={index} onSelect={() => onSelect(context as T)}>
                  {label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      )}
    </DropdownMenu.Root>
  );
};

//
// Toolbar
//

export const Toolbar = {
  Root: ToolbarRoot,
  Text: ToolbarText,
  Button: ToolbarButton,
  IconButton: ToolbarIconButton,
  Link: ToolbarLink,
  Toggle: ToolbarToggle,
  ToggleGroup: ToolbarToggleGroup,
  ToggleGroupItem: ToolbarToggleGroupItem,
  ToggleGroupIconItem: ToolbarToggleGroupIconItem,
  Separator: ToolbarSeparator,
  DragHandle: ToolbarDragHandle,
  CloseIconButton: ToolbarCloseIconButton,
  Menu: ToolbarMenu,
};

export type {
  ToolbarRootProps,
  ToolbarTextProps,
  ToolbarButtonProps,
  ToolbarIconButtonProps,
  ToolbarLinkProps,
  ToolbarToggleProps,
  ToolbarToggleGroupProps,
  ToolbarToggleGroupItemProps,
  ToolbarToggleGroupIconItemProps,
  ToolbarSeparatorProps,
  ToolbarDragHandleProps,
  ToolbarCloseIconButtonProps,
  ToolbarMenuItem,
  ToolbarMenuProps,
};
