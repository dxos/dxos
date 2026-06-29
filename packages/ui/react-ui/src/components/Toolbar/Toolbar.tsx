//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import type { ToggleGroupItemProps as ToggleGroupItemPrimitiveProps } from '@radix-ui/react-toggle-group';
import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import React, { type MouseEventHandler, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { type SlottableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useThemeContext } from '../../hooks';
import { type ToolbarStyleProps } from '../../theme';
import { composable, composableProps, slottable } from '../../util';
import {
  type ButtonGroupProps,
  type ButtonProps,
  type IconButtonProps,
  type ToggleGroupItemProps,
  type ToggleProps,
  Button,
  ButtonGroup,
  IconButton,
  Toggle,
} from '../Button';
import { type LinkProps, Link } from '../Link';
import { DropdownMenu } from '../Menu';
import { type SeparatorProps, Separator } from '../Separator';

//
// Root
//

type ToolbarRootProps = ToolbarPrimitive.ToolbarProps & ToolbarStyleProps;

const ToolbarRoot = composable<HTMLDivElement, ToolbarRootProps>(
  ({ children, density, disabled, layoutManaged, orientation, ...props }, forwardedRef) => {
    const { className, role, ...rest } = composableProps(props);
    const { tx } = useThemeContext();

    return (
      <ToolbarPrimitive.Root
        {...rest}
        // Only pass role when explicitly set; radix provides role="toolbar" by default.
        {...(role !== 'none' && { role })}
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

ToolbarRoot.displayName = 'Toolbar.Root';

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

ToolbarText.displayName = 'Toolbar.Text';

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

ToolbarButton.displayName = 'Toolbar.Button';

//
// IconButton
//

type ToolbarIconButtonProps = IconButtonProps;

const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Button asChild>
      <IconButton {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Button>
  );
});

ToolbarIconButton.displayName = 'Toolbar.IconButton';

type ToolbarToggleProps = ToggleProps;

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>((props, forwardedRef) => {
  return (
    <ToolbarPrimitive.Button asChild>
      <Toggle {...props} ref={forwardedRef} />
    </ToolbarPrimitive.Button>
  );
});

ToolbarToggle.displayName = 'Toolbar.Toggle';

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

ToolbarLink.displayName = 'Toolbar.Link';

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

ToolbarToggleGroup.displayName = 'Toolbar.ToggleGroup';

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

ToolbarToggleGroupItem.displayName = 'Toolbar.ToggleGroupItem';

type ToolbarToggleGroupIconItemProps = Omit<ToggleGroupItemPrimitiveProps, 'className'> & IconButtonProps;

const ToolbarToggleGroupIconItem = forwardRef<HTMLButtonElement, ToolbarToggleGroupIconItemProps>(
  ({ variant, density, elevation, classNames, icon, label, iconOnly, iconClassNames, ...props }, forwardedRef) => {
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
            iconClassNames,
          }}
          ref={forwardedRef}
        />
      </ToolbarPrimitive.ToolbarToggleItem>
    );
  },
);

ToolbarToggleGroupIconItem.displayName = 'Toolbar.ToggleGroupIconItem';

//
// Separator
//

type ToolbarSeparatorProps = SeparatorProps & { variant?: 'gap' | 'line' };

const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ variant = 'gap', ...props }, forwardedRef) => {
    return variant === 'line' ? (
      <ToolbarPrimitive.Separator asChild>
        <Separator orientation='vertical' {...props} ref={forwardedRef} />
      </ToolbarPrimitive.Separator>
    ) : (
      <ToolbarPrimitive.Separator className='grow' ref={forwardedRef} />
    );
  },
);

ToolbarSeparator.displayName = 'Toolbar.Separator';

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

ToolbarDragHandle.displayName = 'Toolbar.DragHandle';

//
// ActionIconButton
//

/**
 * Known semantic actions a toolbar icon-button can represent. Each action
 * picks its own phosphor icon + default translation key so call sites just
 * declare intent (`action='delete'`) rather than re-specifying the icon /
 * label every time.
 */
type ToolbarActionIconButtonAction = 'close' | 'delete';

type ToolbarActionIconButtonProps = {
  action: ToolbarActionIconButtonAction;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  label?: string;
};

const TOOLBAR_ACTION_ICONS: Record<ToolbarActionIconButtonAction, string> = {
  close: 'ph--x--regular',
  delete: 'ph--trash--regular',
};

const TOOLBAR_ACTION_LABEL_KEYS: Record<ToolbarActionIconButtonAction, string> = {
  close: 'toolbar-close.label',
  delete: 'toolbar-delete.label',
};

const ToolbarActionIconButton = forwardRef<HTMLButtonElement, ToolbarActionIconButtonProps>(
  ({ action, onClick, label }, forwardedRef) => {
    const { t } = useTranslation(translationKey);

    return (
      <ToolbarIconButton
        iconOnly
        icon={TOOLBAR_ACTION_ICONS[action]}
        variant='ghost'
        label={label ?? t(TOOLBAR_ACTION_LABEL_KEYS[action])}
        classNames='cursor-pointer'
        onClick={onClick}
        ref={forwardedRef}
      />
    );
  },
);

ToolbarActionIconButton.displayName = 'Toolbar.ActionIconButton';

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
function ToolbarMenu<T extends any | void = void>({ context, items }: ToolbarMenuProps<T>) {
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
}

ToolbarMenu.displayName = 'Toolbar.Menu';

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
  ActionIconButton: ToolbarActionIconButton,
  Menu: ToolbarMenu,
};

export type {
  ToolbarActionIconButtonAction,
  ToolbarActionIconButtonProps,
  ToolbarButtonProps,
  ToolbarDragHandleProps,
  ToolbarIconButtonProps,
  ToolbarLinkProps,
  ToolbarMenuItem,
  ToolbarMenuProps,
  ToolbarRootProps,
  ToolbarSeparatorProps,
  ToolbarTextProps,
  ToolbarToggleGroupIconItemProps,
  ToolbarToggleGroupItemProps,
  ToolbarToggleGroupProps,
  ToolbarToggleProps,
};
