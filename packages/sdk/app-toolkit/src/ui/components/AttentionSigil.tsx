//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, Fragment, forwardRef, useState } from 'react';

import { type Node } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import { type ButtonProps, Button, DropdownMenu, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type AttendableId, type Related, useAttention } from '@dxos/react-ui-attention';
import { mx, osTranslations } from '@dxos/ui-theme';
import { getHostPlatform } from '@dxos/util';

export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};

export type AttentionSigilAction = Pick<Node.ActionLike, 'id' | 'properties' | 'data'>;

export type AttentionSigilButtonSize = 'md' | 'lg';

const sigilSizeClassNames: Record<AttentionSigilButtonSize, string> = {
  md: 'w-(--dx-rail-item) h-(--dx-rail-item)',
  lg: 'w-(--dx-rail-action) h-(--dx-rail-action)',
};

export type AttentionSigilButtonProps = Omit<ButtonProps, 'variant'> &
  AttendableId &
  Related & {
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
      <Button
        {...props}
        variant={variant}
        classNames={['shrink-0 px-0 min-h-0 relative dx-app-no-drag', sigilSizeClassNames[size], classNames]}
        ref={forwardedRef}
      >
        {isMenu && <MenuSignifierHorizontal />}
        {children}
      </Button>
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
  } & Related
>;

/**
 * Attention-aware sigil button that surfaces an object's actions in a dropdown menu.
 * The button reflects attention state (primary when attended/ancestor/related, ghost otherwise).
 */
export const AttentionSigil = forwardRef<HTMLButtonElement, AttentionSigilProps>(
  ({ actions: actionGroups, onAction, triggerLabel, attendableId, icon, related, size, children }, forwardedRef) => {
    const { t } = useTranslation(osTranslations);

    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    const hasActions = actionGroups && actionGroups.length > 0;

    const button = (
      <AttentionSigilButton
        // With no actions there is no DropdownMenu.Trigger, so forward the ref to the button directly.
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
        <Icon icon={icon} />
      </AttentionSigilButton>
    );

    if (!hasActions) {
      return button;
    }

    return (
      <DropdownMenu.Root open={optionsMenuOpen} onOpenChange={setOptionsMenuOpen}>
        <DropdownMenu.Trigger asChild ref={forwardedRef}>
          {button}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content classNames='z-[31]'>
            <DropdownMenu.Viewport>
              {actionGroups?.map((actions, index) => {
                const separator = index > 0 ? <DropdownMenu.Separator /> : null;
                return (
                  <Fragment key={index}>
                    {separator}
                    {actions.map((action) => {
                      const shortcut =
                        typeof action.properties.keyBinding === 'string'
                          ? action.properties.keyBinding
                          : action.properties.keyBinding?.[getHostPlatform()];

                      const menuItemType = action.properties.menuItemType;
                      const Root = menuItemType === 'toggle' ? DropdownMenu.CheckboxItem : DropdownMenu.Item;

                      return (
                        <Root
                          key={action.id}
                          onClick={(event) => {
                            if (action.properties.disabled) {
                              return;
                            }
                            event.stopPropagation();
                            // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                            setOptionsMenuOpen(false);
                            onAction?.(action);
                          }}
                          classNames='gap-2'
                          disabled={action.properties.disabled}
                          checked={menuItemType === 'toggle' ? action.properties.isChecked : undefined}
                          {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                        >
                          <Icon icon={action.properties.icon ?? 'ph--circle-dashed--regular'} size={4} />
                          <span className='grow truncate'>{toLocalizedString(action.properties.label ?? '', t)}</span>
                          {menuItemType === 'toggle' && (
                            <DropdownMenu.ItemIndicator asChild>
                              <Icon icon='ph--check--regular' size={4} />
                            </DropdownMenu.ItemIndicator>
                          )}
                          {shortcut && (
                            <span className={mx('shrink-0', 'text-description')}>{keySymbols(shortcut).join('')}</span>
                          )}
                        </Root>
                      );
                    })}
                  </Fragment>
                );
              })}
              {children}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  },
);
