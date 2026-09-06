//
// Copyright 2023 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, {
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEventHandler,
  forwardRef,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useFocusGroup } from '@dxos/react-focus';
import { useComposedRefs } from '@dxos/react-hooks';
import { type SlottableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useThemeContext } from '../../hooks';
import { DensityProvider } from '../../providers/DensityProvider';
import { type ToolbarStyleProps } from '../../theme';
import { composable, composableProps, slottable } from '../../util';
import {
  Button,
  type ButtonGroupProps,
  type ButtonProps,
  IconButton,
  type IconButtonProps,
  Toggle,
  ToggleGroup,
  ToggleGroupIconItem,
  type ToggleGroupIconItemProps,
  ToggleGroupItem,
  type ToggleGroupItemProps,
  type ToggleGroupProps,
  type ToggleProps,
} from '../Button';
import { Icon } from '../Icon';
import { Link, type LinkProps } from '../Link';
import { DropdownMenu } from '../Menu';
import { Separator, type SeparatorProps } from '../Separator';

//
// Root
//

type ToolbarRootProps = Omit<ComponentPropsWithoutRef<'div'>, 'dir'> &
  ToolbarStyleProps & {
    orientation?: 'horizontal' | 'vertical';
    /** Wrap arrow navigation at the ends (default true). */
    loop?: boolean;
  };

/**
 * A `role="toolbar"` that is one `Tab` stop: arrow keys along `orientation` move between its
 * controls and the last-focused control is where focus returns. The roving focus is
 * `@dxos/react-focus`'s — Ark has no toolbar — so any focusable child is a toolbar item.
 */
const ToolbarRoot = composable<HTMLDivElement, ToolbarRootProps>(
  (
    {
      children,
      density,
      disabled,
      layoutManaged,
      orientation = 'horizontal',
      loop = true,
      onKeyDown,
      onFocus,
      ...props
    },
    forwardedRef,
  ) => {
    const { className, role, ...rest } = composableProps(props);
    const { tx } = useThemeContext();
    const {
      ref: focusGroupRef,
      onKeyDown: onFocusGroupKeyDown,
      onFocus: onFocusGroupFocus,
      ...focusGroupAttrs
    } = useFocusGroup({ axis: orientation, memorizeCurrent: true, cyclic: loop });

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onFocusGroupKeyDown(event);
        onKeyDown?.(event);
      },
      [onFocusGroupKeyDown, onKeyDown],
    );
    const handleFocus = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        onFocusGroupFocus(event);
        onFocus?.(event);
      },
      [onFocusGroupFocus, onFocus],
    );

    return (
      <ark.div
        {...rest}
        {...focusGroupAttrs}
        // Every role the caller sets is forwarded, `role=''` included: dropping it would leave the
        // default in place and silently invert the caller's intent.
        role={role ?? 'toolbar'}
        {...(orientation === 'vertical' && { 'aria-orientation': 'vertical' })}
        data-orientation={orientation}
        data-arrow-keys={orientation === 'vertical' ? 'up down' : 'left right'}
        className={tx('toolbar.root', { density, disabled, layoutManaged }, className)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        ref={useComposedRefs<HTMLDivElement>(forwardedRef, focusGroupRef)}
      >
        {/* The class alone cannot resize the bar's controls: `Button` and `Input` stamp
            `data-density` from context — `md` from the root provider unless something nearer says
            otherwise — and that stamp sits ON the control, so it shadows the `--dx-control` the bar's
            class set around it. The context is what those controls read, so the bar provides both:
            the class for descendants that only read the variable, the context for those that stamp. */}
        {density ? <DensityProvider density={density}>{children}</DensityProvider> : children}
      </ark.div>
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
  const { tx } = useThemeContext();
  return (
    <ark.div asChild={asChild} {...rest} className={tx('toolbar.text', {}, className)} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});

ToolbarText.displayName = 'Toolbar.Text';

//
// Button
//

type ToolbarButtonProps = ButtonProps;

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>((props, forwardedRef) => {
  return <Button {...props} ref={forwardedRef} />;
});

ToolbarButton.displayName = 'Toolbar.Button';

//
// IconButton
//

type ToolbarIconButtonProps = IconButtonProps;

const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>((props, forwardedRef) => {
  return <IconButton {...props} ref={forwardedRef} />;
});

ToolbarIconButton.displayName = 'Toolbar.IconButton';

type ToolbarToggleProps = ToggleProps;

const ToolbarToggle = forwardRef<HTMLButtonElement, ToolbarToggleProps>((props, forwardedRef) => {
  return <Toggle {...props} ref={forwardedRef} />;
});

ToolbarToggle.displayName = 'Toolbar.Toggle';

//
// Link
//

type ToolbarLinkProps = LinkProps;

const ToolbarLink = forwardRef<HTMLAnchorElement, ToolbarLinkProps>((props, forwardedRef) => {
  return <Link {...props} ref={forwardedRef} />;
});

ToolbarLink.displayName = 'Toolbar.Link';

type ToolbarToggleGroupProps = ToggleGroupProps & ButtonGroupProps;

//
// ToggleGroup
//

/** A toggle group inside the bar leaves arrow navigation to the bar. */
const ToolbarToggleGroup = forwardRef<HTMLDivElement, ToolbarToggleGroupProps>((props, forwardedRef) => {
  return <ToggleGroup {...props} rovingFocus={false} ref={forwardedRef} />;
});

ToolbarToggleGroup.displayName = 'Toolbar.ToggleGroup';

type ToolbarToggleGroupItemProps = ToggleGroupItemProps;

const ToolbarToggleGroupItem = forwardRef<HTMLButtonElement, ToolbarToggleGroupItemProps>((props, forwardedRef) => {
  return <ToggleGroupItem {...props} ref={forwardedRef} />;
});

ToolbarToggleGroupItem.displayName = 'Toolbar.ToggleGroupItem';

type ToolbarToggleGroupIconItemProps = ToggleGroupIconItemProps;

const ToolbarToggleGroupIconItem = forwardRef<HTMLButtonElement, ToolbarToggleGroupIconItemProps>(
  (props, forwardedRef) => {
    return <ToggleGroupIconItem {...props} ref={forwardedRef} />;
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
      <Separator orientation='vertical' {...props} ref={forwardedRef} />
    ) : (
      <div role='separator' aria-orientation='vertical' className='grow' ref={forwardedRef} />
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
  /** Optional leading icon (e.g. `ph--trash--regular`). */
  icon?: string;
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
              {items?.map(({ label, icon, onClick: onSelect }, index) => (
                <DropdownMenu.Item key={index} onSelect={() => onSelect(context as T)}>
                  {icon && <Icon icon={icon} />}
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
