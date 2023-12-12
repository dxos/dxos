//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React, { type FC, Fragment, type MutableRefObject, useRef, useState } from 'react';

import { Button, Dialog, DropdownMenu, Popover, Tooltip, useTranslation } from '@dxos/react-ui';
import { type MosaicActiveType } from '@dxos/react-ui-mosaic';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, getSize, hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import type { TreeNodeAction } from '../types';
import { keyString } from '../util';

type NavTreeItemActionProps = {
  id: string;
  label?: string;
  icon: FC<IconProps>;
  action?: TreeNodeAction;
  actions?: TreeNodeAction[];
  level: number;
  active?: MosaicActiveType;
  popoverAnchorId?: string;
  testId?: string;
  menuType?: 'searchList' | 'dropdown';
};

const NavTreeItemActionDropdownMenu = ({
  icon: Icon,
  active,
  testId,
  actions,
  suppressNextTooltip,
}: Pick<NavTreeItemActionProps, 'icon' | 'actions' | 'testId' | 'active'> & {
  suppressNextTooltip: MutableRefObject<boolean>;
}) => {
  const { t } = useTranslation(translationKey);

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
            data-testid={testId}
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
                {action.icon && <action.icon className={mx(getSize(4), 'shrink-0')} />}
                <span className='grow truncate'>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
                {action.keyBinding && (
                  <span className={mx('shrink-0', descriptionText)}>{keyString(action.keyBinding)}</span>
                )}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const NavTreeItemActionSearchList = ({
  icon: Icon,
  active,
  label,
  testId,
  actions,
  suppressNextTooltip,
}: Pick<NavTreeItemActionProps, 'icon' | 'actions' | 'testId' | 'active' | 'label'> & {
  suppressNextTooltip: MutableRefObject<boolean>;
}) => {
  const { t } = useTranslation(translationKey);

  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  // TODO(thure): Use LayoutPlugin’s global Dialog.
  return (
    <Dialog.Root
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
      <Dialog.Trigger asChild>
        <Tooltip.Trigger asChild>
          <Button
            variant='ghost'
            classNames={[
              'shrink-0 pli-2 pointer-fine:pli-1',
              hoverableControlItem,
              hoverableOpenControlItem,
              active === 'overlay' && 'invisible',
            ]}
            data-testid={testId}
          >
            <Icon className={getSize(4)} />
          </Button>
        </Tooltip.Trigger>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content classNames='z-[31] is-full max-is-[24rem] p-0'>
            <SearchList.Root label={t('tree item searchlist input placeholder')}>
              <SearchList.Input placeholder={t('tree item searchlist input placeholder')} classNames='p-4' />
              <SearchList.Content classNames='min-bs-[12rem] bs-[50dvh] max-bs-[20rem] overflow-auto border border-is-0 border-ie-0 border-neutral-200 dark:border-neutral-800 p-2'>
                {actions?.map((action) => {
                  const value = Array.isArray(action.label) ? t(...action.label) : action.label;
                  return (
                    <SearchList.Item
                      value={value}
                      key={action.id}
                      onClick={(event) => {
                        if (action.properties.disabled) {
                          return;
                        }
                        event.stopPropagation();
                        suppressNextTooltip.current = true;
                        setOptionsMenuOpen(false);
                        void action.invoke();
                      }}
                      classNames='flex items-center gap-2 pli-2'
                      disabled={action.properties.disabled}
                      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                    >
                      {action.icon && <action.icon className={mx(getSize(4), 'shrink-0')} />}
                      <span className='grow truncate'>{value}</span>
                      {action.keyBinding && (
                        <span className={mx('shrink-0', descriptionText)}>{keyString(action.keyBinding)}</span>
                      )}
                    </SearchList.Item>
                  );
                })}
              </SearchList.Content>
              <div role='none' className='flex items-center plb-2 pli-3'>
                <span className={descriptionText}>{label}</span>
              </div>
            </SearchList.Root>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const NavTreeItemAction = ({
  id,
  label,
  icon: Icon,
  action,
  actions,
  active,
  level,
  popoverAnchorId,
  testId,
  menuType,
}: NavTreeItemActionProps) => {
  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);

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
        {label && (
          <Tooltip.Portal>
            <Tooltip.Content classNames='z-[31]' side='bottom'>
              {label}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
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
              data-testid={testId}
            >
              <Icon className={getSize(4)} />
            </Button>
          </Tooltip.Trigger>
        ) : menuType === 'searchList' ? (
          <NavTreeItemActionSearchList
            actions={actions}
            testId={testId}
            active={active}
            suppressNextTooltip={suppressNextTooltip}
            icon={Icon}
            label={label}
          />
        ) : (
          <NavTreeItemActionDropdownMenu
            actions={actions}
            testId={testId}
            active={active}
            suppressNextTooltip={suppressNextTooltip}
            icon={Icon}
          />
        )}
      </Tooltip.Root>
    </ActionRoot>
  );
};
