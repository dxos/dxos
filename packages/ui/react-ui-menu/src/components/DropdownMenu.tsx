//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type MutableRefObject, type PropsWithChildren } from 'react';

import { keySymbols } from '@dxos/keyboard';
import { DropdownMenu as NaturalDropdownMenu, Icon, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { mx, descriptionText } from '@dxos/react-ui-theme';

import { type MenuProps } from '../defs';
import { translationKey } from '../translations';
import { getShortcut } from '../util';

export type DropdownMenuProps = PropsWithChildren<MenuProps> &
  Partial<{
    defaultMenuOpen: boolean;
    menuOpen: boolean;
    onMenuOpenChange: (nextOpen: boolean) => void;
    suppressNextTooltip?: MutableRefObject<boolean>;
  }>;

const DropdownMenuRoot = ({
  defaultMenuOpen,
  actions,
  menuOpen,
  suppressNextTooltip,
  onMenuOpenChange,
  onAction,
  children,
}: DropdownMenuProps) => {
  const { t } = useTranslation(translationKey);

  const [optionsMenuOpen, setOptionsMenuOpen] = useControllableState({
    prop: menuOpen,
    defaultProp: defaultMenuOpen,
    onChange: onMenuOpenChange,
  });

  return (
    <NaturalDropdownMenu.Root
      {...{
        open: optionsMenuOpen,
        onOpenChange: (nextOpen: boolean) => {
          if (!nextOpen && suppressNextTooltip) {
            suppressNextTooltip.current = true;
          }
          return setOptionsMenuOpen(nextOpen);
        },
      }}
    >
      {children}
      <NaturalDropdownMenu.Portal>
        <NaturalDropdownMenu.Content>
          <NaturalDropdownMenu.Viewport>
            {actions?.map((action) => {
              const shortcut = getShortcut(action);
              return (
                <NaturalDropdownMenu.Item
                  key={action.id}
                  onClick={(event) => {
                    if (action.properties?.disabled) {
                      return;
                    }
                    event.stopPropagation();
                    // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                    if (suppressNextTooltip) {
                      suppressNextTooltip.current = true;
                    }
                    setOptionsMenuOpen(false);
                    onAction?.(action);
                  }}
                  classNames='gap-2'
                  disabled={action.properties?.disabled}
                  {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                >
                  {action.properties?.icon && <Icon icon={action.properties!.icon} size={4} />}
                  <span className='grow truncate'>{toLocalizedString(action.properties!.label, t)}</span>
                  {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
                </NaturalDropdownMenu.Item>
              );
            })}
          </NaturalDropdownMenu.Viewport>
          <NaturalDropdownMenu.Arrow />
        </NaturalDropdownMenu.Content>
      </NaturalDropdownMenu.Portal>
    </NaturalDropdownMenu.Root>
  );
};

export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Trigger: NaturalDropdownMenu.Trigger,
  VirtualTrigger: NaturalDropdownMenu.VirtualTrigger,
};
