//
// Copyright 2024 DXOS.org
//

import React, {
  type ComponentPropsWithoutRef,
  Fragment,
  type MouseEvent,
  type PropsWithChildren,
  forwardRef,
  useState,
} from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { keySymbols } from '@dxos/react-focus';
import { Attention, useAttention } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import * as Theme from '@dxos/react-ui/Theme';
import { osTranslations } from '@dxos/ui-theme';
import { resolveKeyBinding } from '@dxos/util';

export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};

export type AttentionSigilAction = Pick<AppGraphNode.ActionLike, 'id' | 'properties' | 'data'>;

export type AttentionSigilButtonSize = 'md' | 'lg';

const sigilSizeClassNames: Record<AttentionSigilButtonSize, string> = {
  md: 'w-(--dx-rail-item) h-(--dx-rail-item)',
  lg: 'w-(--dx-rail-action) h-(--dx-rail-action)',
};

export type AttentionSigilButtonProps = Omit<ComponentPropsWithoutRef<typeof Button.Button>, 'variant' | 'size'> &
  Attention.AttendableId &
  Attention.Related & {
    isMenu?: boolean;
    /** Button dimensions: `md` (32px) or `lg` (40px, default). */
    size?: AttentionSigilButtonSize;
  };

/**
 * A small line under the button indicating that it opens a menu.
 */
const MenuSignifierHorizontal = () => (
  <svg className='absolute bottom-[7px]' width={20} height={2} viewBox='0 0 20 2' stroke='currentColor' opacity={0.5}>
    <line
      x1={0.5}
      y1={0.75}
      x2={19}
      y2={0.75}
      strokeWidth={1.25}
      strokeLinecap='round'
      strokeDasharray='6 20'
      strokeDashoffset='-6.5'
    />
  </svg>
);

export const AttentionSigilButton = forwardRef<HTMLButtonElement, AttentionSigilButtonProps>(
  ({ children, attendableId, classNames, related, isMenu = true, size = 'lg', ...props }, forwardedRef) => {
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    const variant = (related && isRelated) || hasAttention || isAncestor ? 'primary' : 'ghost';
    // TODO(wittjosiah): Disable hover styles when isMenu is false.
    return (
      <Button.Button
        {...props}
        variant={variant}
        classNames={['shrink-0 px-0 min-h-0 relative dx-app-no-drag', sigilSizeClassNames[size], classNames]}
        ref={forwardedRef}
      >
        {isMenu && <MenuSignifierHorizontal />}
        {children}
      </Button.Button>
    );
  },
);

export type AttentionSigilProps = PropsWithChildren<
  {
    attendableId?: string;
    triggerLabel: string;
    actions?: AttentionSigilAction[][];
    icon: string;
    /** Button dimensions: `md` (32px) or `lg` (40px, default). */
    size?: AttentionSigilButtonSize;
    onAction?: (action: AttentionSigilAction) => void;
  } & Attention.Related
>;

/**
 * Attention-aware sigil button that surfaces an object's actions in a dropdown menu.
 * The button reflects attention state (primary when attended/ancestor/related, ghost otherwise).
 */
export const AttentionSigil = forwardRef<HTMLButtonElement, AttentionSigilProps>(
  ({ actions: actionGroups, onAction, triggerLabel, attendableId, icon, related, size, children }, forwardedRef) => {
    const { t } = Hooks.useTranslation(osTranslations);

    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    const hasActions = actionGroups && actionGroups.length > 0;

    const button = (
      <AttentionSigilButton
        // With no actions there is no Menu.Trigger, so forward the ref to the button directly.
        ref={!hasActions ? forwardedRef : undefined}
        attendableId={attendableId}
        related={related}
        size={size}
        isMenu={hasActions}
        // TODO(wittjosiah): Better disabling of interactive styles when no action are available.
        //   Remove underscore icon when no actions are available?
        classNames={!hasActions && 'cursor-default'}
      >
        <span className='sr-only'>{triggerLabel}</span>
        <Icon.Icon icon={icon} />
      </AttentionSigilButton>
    );

    if (!hasActions) {
      return button;
    }

    return (
      <Menu.Root open={optionsMenuOpen} onOpenChange={({ open }) => setOptionsMenuOpen(open)}>
        <Menu.Trigger asChild ref={forwardedRef}>
          {button}
        </Menu.Trigger>
        <Menu.Content classNames='z-[31]'>
          {actionGroups?.map((actions, index) => {
            const separator = index > 0 ? <Menu.Separator /> : null;
            return (
              <Fragment key={index}>
                {separator}
                {actions.map((action) => {
                  const shortcut = resolveKeyBinding(action.properties.keyBinding);
                  const item: Menu.Option = {
                    value: action.id,
                    label: Theme.toLocalizedString(action.properties.label ?? '', t),
                    icon: action.properties.icon ?? 'ph--circle-dashed--regular',
                    shortcut: shortcut ? keySymbols(shortcut).join('') : undefined,
                    disabled: action.properties.disabled,
                  };
                  const handleClick = (event: MouseEvent) => {
                    if (action.properties.disabled) {
                      return;
                    }
                    event.stopPropagation();
                    // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                    setOptionsMenuOpen(false);
                    onAction?.(action);
                  };
                  const testId = action.properties?.testId && { 'data-testid': action.properties.testId };

                  return action.properties.menuItemType === 'toggle' ? (
                    <Menu.CheckboxItem
                      key={action.id}
                      item={item}
                      checked={!!action.properties.isChecked}
                      onClick={handleClick}
                      {...testId}
                    />
                  ) : (
                    <Menu.Item key={action.id} item={item} onClick={handleClick} {...testId} />
                  );
                })}
              </Fragment>
            );
          })}
          {children}
        </Menu.Content>
      </Menu.Root>
    );
  },
);
