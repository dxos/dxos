//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React, { type FC, Fragment, useRef, useState } from 'react';

import { Button, DropdownMenu, Popover, Tooltip, useTranslation } from '@dxos/react-ui';
import { type MosaicActiveType } from '@dxos/react-ui-mosaic';
import { getSize, hoverableControlItem, hoverableOpenControlItem } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import type { TreeNodeAction } from '../types';
import { keyString } from '../util';

type NavTreeItemActionMenuProps = {
  id: string;
  label: string;
  icon: FC<IconProps>;
  action?: TreeNodeAction;
  actions?: TreeNodeAction[];
  level: number;
  active?: MosaicActiveType;
  popoverAnchorId?: string;
};

export const NavTreeItemActionMenu = ({
  id,
  label,
  icon: Icon,
  action,
  actions,
  active,
  level,
  popoverAnchorId,
}: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(translationKey);

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const ActionRoot = popoverAnchorId === `dxos.org/ui/navtree/${id}` ? Popover.Anchor : Fragment;

  return (
    <ActionRoot>
      <Tooltip.Root
        open={optionsTooltipOpen}
        onOpenChange={(nextOpen) => {
          if (suppressNextTooltip.current) {
            setOptionsTooltipOpen(false);
            suppressNextTooltip.current = false;
          } else {
            setOptionsTooltipOpen(nextOpen);
          }
        }}
      >
        <Tooltip.Portal>
          <Tooltip.Content classNames='z-[31]' side='bottom'>
            {label}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
        {action ? (
          <Tooltip.Trigger asChild>
            <Button
              variant='ghost'
              classNames={[
                'shrink-0 pli-2 pointer-fine:pli-1',
                hoverableControlItem,
                hoverableOpenControlItem,
                active === 'overlay' && 'invisible',
              ]}
              onClick={(event) => {
                if (action.properties.disabled) {
                  return;
                }
                event.stopPropagation();
                void action.invoke();
              }}
              data-testid={`navtree.treeItem.actionsLevel${level}`}
            >
              <Icon className={getSize(4)} />
            </Button>
          </Tooltip.Trigger>
        ) : (
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
            <DropdownMenu.Trigger asChild>
              <Tooltip.Trigger asChild>
                <Button
                  variant='ghost'
                  classNames={[
                    'shrink-0 pli-2 pointer-fine:pli-1',
                    hoverableControlItem,
                    hoverableOpenControlItem,
                    active === 'overlay' && 'invisible',
                  ]}
                  data-testid={`navtree.treeItem.actionsLevel${level}`}
                >
                  <Icon className={getSize(4)} />
                </Button>
              </Tooltip.Trigger>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content classNames='z-[31]'>
                <DropdownMenu.Viewport>
                  {actions?.map((action) => (
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
                        void action.invoke();
                      }}
                      classNames='gap-2'
                      disabled={action.properties.disabled}
                      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                    >
                      {action.icon && (
                        <div className='shrink-0'>
                          <action.icon className={getSize(4)} />
                        </div>
                      )}
                      <div className='grow truncate'>
                        {Array.isArray(action.label) ? t(...action.label) : action.label}
                      </div>
                      {action.keyBinding && <div className='shrink-0 opacity-50'>{keyString(action.keyBinding)}</div>}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </Tooltip.Root>
    </ActionRoot>
  );
};
