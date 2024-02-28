//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import React, { type FC, type MutableRefObject, type PropsWithChildren, useRef, useState } from 'react';

import { type Label } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import { Button, Dialog, DropdownMenu, ContextMenu, Tooltip, useTranslation } from '@dxos/react-ui';
import { type MosaicActiveType, useMosaic } from '@dxos/react-ui-mosaic';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, getSize, hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { translationKey } from '../translations';
import type { TreeNodeAction } from '../types';

type NavTreeItemActionProps = {
  label?: string;
  icon: FC<IconProps>;
  variant?: 'plank-heading' | 'tree-item';
  action?: TreeNodeAction;
  actions?: TreeNodeAction[];
  active?: MosaicActiveType;
  testId?: string;
  caller?: string;
  menuType?: 'searchList' | 'dropdown';
  onAction?: (action: TreeNodeAction) => void;
};

export const NavTreeItemActionDropdownMenu = ({
  icon: Icon,
  variant,
  active,
  testId,
  actions,
  suppressNextTooltip,
  onAction,
}: Pick<NavTreeItemActionProps, 'icon' | 'variant' | 'actions' | 'testId' | 'active' | 'onAction'> & {
  suppressNextTooltip: MutableRefObject<boolean>;
}) => {
  const { t } = useTranslation(translationKey);
  const getLabel = (label: Label) => (Array.isArray(label) ? t(...label) : label);

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
      <Tooltip.Trigger asChild>
        <DropdownMenu.Trigger asChild>
          <Button
            variant={variant === 'plank-heading' ? 'primary' : 'ghost'}
            classNames={[
              'shrink-0 pli-2 pointer-fine:pli-1',
              hoverableControlItem,
              hoverableOpenControlItem,
              variant === 'plank-heading' && 'min-bs-0 is-[--rail-action] bs-[--rail-action] rounded-sm pli-0',
              active === 'overlay' && 'invisible',
            ]}
            data-testid={testId}
            aria-label={t('tree item actions label')}
          >
            <Icon
              className={getSize(variant === 'plank-heading' ? 5 : 4)}
              weight={variant === 'plank-heading' ? 'duotone' : 'regular'}
            />
          </Button>
        </DropdownMenu.Trigger>
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
                  <span className='grow truncate'>{getLabel(action.label)}</span>
                  {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export const NavTreeItemActionContextMenu = (
  props: PropsWithChildren<Pick<NavTreeItemActionProps, 'actions' | 'onAction'>>,
) => {
  return (props.actions?.length ?? 0) > 0 ? <NavTreeItemActionContextMenuImpl {...props} /> : <>{props.children}</>;
};

const NavTreeItemActionContextMenuImpl = ({
  actions,
  onAction,
  children,
}: PropsWithChildren<Pick<NavTreeItemActionProps, 'actions' | 'onAction'>>) => {
  const { t } = useTranslation(translationKey);
  const getLabel = (label: Label) => (Array.isArray(label) ? t(...label) : label);
  const { activeItem } = useMosaic();

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        {/* ContextMenu’s `open` state is not controllable, so if it happens to be/become open during dragging, the best we can do is hide it. */}
        <ContextMenu.Content classNames={mx('z-[31]', activeItem && 'hidden')}>
          <ContextMenu.Viewport>
            {actions?.map((action) => {
              const shortcut =
                typeof action.keyBinding === 'string' ? action.keyBinding : action.keyBinding?.[getHostPlatform()];
              return (
                <ContextMenu.Item
                  key={action.id}
                  onClick={(event) => {
                    if (action.properties.disabled) {
                      return;
                    }
                    event.stopPropagation();
                    onAction?.(action);
                  }}
                  classNames='gap-2'
                  disabled={action.properties.disabled}
                  {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                >
                  {action.icon && <action.icon className={mx(getSize(4), 'shrink-0')} />}
                  <span className='grow truncate'>{getLabel(action.label)}</span>
                  {shortcut && <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>}
                </ContextMenu.Item>
              );
            })}
          </ContextMenu.Viewport>
          <ContextMenu.Arrow />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export const NavTreeItemActionSearchList = ({
  icon: Icon,
  active,
  label,
  testId,
  actions,
  suppressNextTooltip,
  onAction,
}: Pick<NavTreeItemActionProps, 'icon' | 'actions' | 'testId' | 'active' | 'label' | 'onAction'> & {
  suppressNextTooltip: MutableRefObject<boolean>;
}) => {
  const { t } = useTranslation(translationKey);
  const getLabel = (label: Label) => (Array.isArray(label) ? t(...label) : label);

  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const button = useRef<HTMLButtonElement | null>(null);

  // TODO(burdon): Optionally sort.
  const sortedActions = actions?.sort(({ label: l1 }, { label: l2 }) => {
    const t1 = getLabel(l1).toLowerCase();
    const t2 = getLabel(l2).toLowerCase();
    return t1.localeCompare(t2);
  });

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
      <Tooltip.Trigger asChild>
        <Dialog.Trigger asChild>
          <Button
            ref={button}
            variant='ghost'
            classNames={[
              'shrink-0 pli-2 pointer-fine:pli-1',
              hoverableControlItem,
              hoverableOpenControlItem,
              active === 'overlay' && 'invisible',
            ]}
            data-testid={testId}
            onKeyDownCapture={(event) => {
              // TODO(thure): Why is only this `Button` affected and not `DropdownMenu.Trigger`’s?
              if (button.current && button.current === event.target) {
                switch (event.key) {
                  case 'Enter':
                  case ' ':
                    // Capture this event and stop propagation to the drag start handler.
                    event.stopPropagation();
                    setOptionsMenuOpen(true);
                    break;
                  default:
                }
              }
            }}
          >
            <Icon className={getSize(4)} />
          </Button>
        </Dialog.Trigger>
      </Tooltip.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content classNames={['z-[31] is-full max-is-[24rem] px-2 py-1']}>
            <SearchList.Root label={t('tree item searchlist input placeholder')}>
              <SearchList.Input placeholder={t('tree item searchlist input placeholder')} classNames={mx('px-3')} />
              <SearchList.Content classNames={['min-bs-[12rem] bs-[50dvh] max-bs-[30rem] overflow-auto']}>
                {sortedActions?.map((action) => {
                  const label = getLabel(action.label);
                  const shortcut =
                    typeof action.keyBinding === 'string' ? action.keyBinding : action.keyBinding?.[getHostPlatform()];
                  return (
                    <SearchList.Item
                      value={label}
                      key={action.id}
                      onSelect={() => {
                        if (action.properties.disabled) {
                          return;
                        }

                        suppressNextTooltip.current = true;
                        setOptionsMenuOpen(false);
                        onAction?.(action);
                      }}
                      classNames='flex items-center gap-2 pli-2'
                      disabled={action.properties.disabled}
                      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                    >
                      {action.icon && <action.icon className={mx(getSize(4), 'shrink-0')} />}
                      <span className='grow truncate'>{label}</span>
                      {shortcut && (
                        <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>
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
  label,
  icon: Icon,
  variant,
  action,
  actions,
  active,
  testId,
  caller,
  menuType,
}: NavTreeItemActionProps) => {
  const suppressNextTooltip = useRef<boolean>(false);
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
              void action.invoke(caller ? { caller } : undefined);
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
          onAction={(action) => action.invoke(caller ? { caller } : undefined)}
        />
      ) : (
        <NavTreeItemActionDropdownMenu
          actions={actions}
          testId={testId}
          active={active}
          suppressNextTooltip={suppressNextTooltip}
          icon={Icon}
          variant={variant}
          onAction={(action) => action.invoke(caller ? { caller } : undefined)}
        />
      )}
    </Tooltip.Root>
  );
};
