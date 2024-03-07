//
// Copyright 2024 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React, { type ComponentPropsWithRef, forwardRef, type PropsWithChildren, useRef, useState } from 'react';

import { keySymbols } from '@dxos/keyboard';
import {
  Button,
  type ButtonProps,
  DropdownMenu,
  type ThemedClassName,
  toLocalizedString,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { translationKey } from '../../translations';
import { type PlankHeadingAction } from '../../types';
import { useHasAttention } from '../Attention';

type AttendableId = { attendableId: string };

type PlankHeadingButtonProps = Omit<ButtonProps, 'variant'> & AttendableId;

const plankHeadingIconProps: IconProps = {
  className: getSize(5),
  weight: 'duotone',
};

const PlankHeadingButton = forwardRef<HTMLButtonElement, PlankHeadingButtonProps>(
  ({ attendableId, classNames, ...props }, forwardedRef) => {
    const hasAttention = useHasAttention(attendableId);
    return (
      <Button
        {...props}
        variant={hasAttention ? 'primary' : 'ghost'}
        classNames={['m-1 shrink-0 pli-0 min-bs-0 is-[--rail-action] bs-[--rail-action]', classNames]}
        ref={forwardedRef}
      />
    );
  },
);

type PlankHeadingActionsMenuProps = PropsWithChildren<{
  triggerLabel?: string;
  actions?: PlankHeadingAction[];
  onAction?: (action: PlankHeadingAction) => void;
}>;

const PlankHeadingActionsMenu = ({ actions, onAction, triggerLabel, children }: PlankHeadingActionsMenuProps) => {
  const { t } = useTranslation(translationKey);
  const suppressNextTooltip = useRef(false);

  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [triggerTooltipOpen, setTriggerTooltipOpen] = useState(false);

  return (
    <Tooltip.Root
      open={triggerTooltipOpen}
      onOpenChange={(nextOpen) => {
        if (suppressNextTooltip.current) {
          setTriggerTooltipOpen(false);
          suppressNextTooltip.current = false;
        } else {
          setTriggerTooltipOpen(nextOpen);
        }
      }}
    >
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
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content classNames='z-[31]'>
            <DropdownMenu.Viewport>
              {actions?.map((action) => {
                const shortcut =
                  typeof action.keyBinding === 'string' ? action.keyBinding : action.keyBinding?.[getHostPlatform()];
                return (
                  <DropdownMenu.Item
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
                    {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                  >
                    {action.icon && <action.icon className={mx(getSize(4), 'shrink-0')} />}
                    <span className='grow truncate'>{toLocalizedString(action.label, t)}</span>
                    {shortcut && (
                      <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>
                    )}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Tooltip.Portal>
        <Tooltip.Content style={{ zIndex: 70 }}>
          {triggerLabel}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

type PlankHeadingLabelProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & AttendableId;

const PlankHeadingLabel = forwardRef<HTMLHeadingElement, PlankHeadingLabelProps>(
  ({ attendableId, classNames, ...props }, forwardedRef) => {
    const hasAttention = useHasAttention(attendableId);
    return (
      <h1
        {...props}
        data-attention={hasAttention.toString()}
        className={mx('pli-1 min-is-0 shrink truncate font-medium fg-base data-[attention=true]:fg-accent', classNames)}
        ref={forwardedRef}
      />
    );
  },
);

export const PlankHeading = {
  Button: PlankHeadingButton,
  Label: PlankHeadingLabel,
  ActionsMenu: PlankHeadingActionsMenu,
};
export { plankHeadingIconProps };

export type { PlankHeadingButtonProps, PlankHeadingActionsMenuProps };
