//
// Copyright 2024 DXOS.org
//

import React, { Fragment, type PropsWithChildren, forwardRef, useRef, useState } from 'react';

import { type ActionLike } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import { Button, type ButtonProps, DropdownMenu, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type AttendableId, type Related, useAttention } from '@dxos/react-ui-attention';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { MenuSignifierHorizontal } from './MenuSignifier';
import { translationKey } from '../translations';

export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};

export type StackItemSigilAction = Pick<ActionLike, 'id' | 'properties' | 'data'>;

export type StackItemSigilButtonProps = Omit<ButtonProps, 'variant'> & AttendableId & Related;

export const StackItemSigilButton = forwardRef<HTMLButtonElement, StackItemSigilButtonProps>(
  ({ attendableId, classNames, related, children, ...props }, forwardedRef) => {
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    const variant = (related && isRelated) || hasAttention || isAncestor ? 'primary' : 'ghost';
    return (
      <Button
        {...props}
        variant={variant}
        classNames={['shrink-0 pli-0 min-bs-0 is-[--rail-action] bs-[--rail-action] relative', classNames]}
        ref={forwardedRef}
      >
        <MenuSignifierHorizontal />
        {children}
      </Button>
    );
  },
);

export type StackItemSigilProps = PropsWithChildren<
  {
    attendableId?: string;
    triggerLabel: string;
    actions?: StackItemSigilAction[][];
    icon: string;
    onAction?: (action: StackItemSigilAction) => void;
  } & Related
>;

export const StackItemSigil = forwardRef<HTMLButtonElement, StackItemSigilProps>(
  ({ actions: actionGroups, onAction, triggerLabel, attendableId, icon, related, children }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const suppressNextTooltip = useRef(false);

    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    return (
      <DropdownMenu.Root
        {...{
          open: optionsMenuOpen,
          onOpenChange: (nextOpen: boolean) => {
            if (!nextOpen) {
              suppressNextTooltip.current = true;
            }
            return setOptionsMenuOpen(nextOpen);
          },
        }}
      >
        <DropdownMenu.Trigger asChild ref={forwardedRef}>
          <StackItemSigilButton attendableId={attendableId} related={related}>
            <span className='sr-only'>{triggerLabel}</span>
            <Icon icon={icon} size={5} />
          </StackItemSigilButton>
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
                            suppressNextTooltip.current = true;
                            setOptionsMenuOpen(false);
                            onAction?.(action);
                          }}
                          classNames='gap-2'
                          disabled={action.properties.disabled}
                          checked={menuItemType === 'toggle' ? action.properties.isChecked : undefined}
                          {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                        >
                          <Icon icon={action.properties.icon ?? 'ph--placeholder--regular'} size={4} />
                          <span className='grow truncate'>{toLocalizedString(action.properties.label ?? '', t)}</span>
                          {menuItemType === 'toggle' && (
                            <DropdownMenu.ItemIndicator asChild>
                              <Icon icon='ph--check--regular' size={4} />
                            </DropdownMenu.ItemIndicator>
                          )}
                          {shortcut && (
                            <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>
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
