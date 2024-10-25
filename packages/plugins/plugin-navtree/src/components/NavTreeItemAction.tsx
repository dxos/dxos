//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type MutableRefObject, type PropsWithChildren, useRef, useState } from 'react';

import { type Action, type ActionLike, type Node } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import {
  Button,
  Dialog,
  DropdownMenu,
  ContextMenu,
  Tooltip,
  useTranslation,
  toLocalizedString,
  Icon,
} from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { NAVTREE_PLUGIN } from '../meta';
import { type ActionProperties } from '../types';

export type NavTreeItemActionMenuProps = ActionProperties & {
  parent: Node;
  caller?: string;
  monolithic?: boolean;
  menuActions?: Action[];
  suppressNextTooltip?: MutableRefObject<boolean>;
  menuOpen?: boolean;
  defaultMenuOpen?: boolean;
  onChangeMenuOpen?: (nextOpen: boolean) => void;
  onAction?: (action: Action) => void;
};

const getShortcut = (action: ActionLike) => {
  return typeof action.properties?.keyBinding === 'string'
    ? action.properties.keyBinding
    : action.properties?.keyBinding?.[getHostPlatform()];
};

const fallbackIcon = 'ph--placeholder--regular';

export const NavTreeItemActionDropdownMenu = ({
  label,
  icon,
  testId,
  defaultMenuOpen,
  menuActions,
  menuOpen,
  suppressNextTooltip,
  onChangeMenuOpen,
  onAction,
}: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const [optionsMenuOpen, setOptionsMenuOpen] = useControllableState({
    prop: menuOpen,
    defaultProp: defaultMenuOpen,
    onChange: onChangeMenuOpen,
  });

  return (
    <DropdownMenu.Root
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
      <Tooltip.Trigger asChild>
        <DropdownMenu.Trigger asChild>
          <Button
            variant='ghost'
            density='fine'
            classNames={mx('shrink-0 !pli-2 pointer-fine:!pli-1', hoverableControlItem, hoverableOpenControlItem)}
            data-testid={testId}
            aria-label={t('tree item actions label')}
          >
            <span className='sr-only'>{toLocalizedString(label, t)}</span>
            <Icon icon={icon ?? fallbackIcon} size={4} />
          </Button>
        </DropdownMenu.Trigger>
      </Tooltip.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content classNames='z-[31]'>
          <DropdownMenu.Viewport>
            {menuActions?.map((action) => {
              const shortcut = getShortcut(action);
              return (
                <DropdownMenu.Item
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
  props: PropsWithChildren<Pick<NavTreeItemActionMenuProps, 'menuActions' | 'onAction'>>,
) => {
  return (props.menuActions?.length ?? 0) > 0 ? <NavTreeItemActionContextMenuImpl {...props} /> : <>{props.children}</>;
};

const NavTreeItemActionContextMenuImpl = ({
  menuActions,
  onAction,
  children,
}: PropsWithChildren<Pick<NavTreeItemActionMenuProps, 'menuActions' | 'onAction'>>) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content classNames='z-[31]'>
          <ContextMenu.Viewport>
            {menuActions?.map((action) => {
              const shortcut = getShortcut(action);
              return (
                <ContextMenu.Item
                  key={action.id}
                  onClick={(event) => {
                    if (action.properties?.disabled) {
                      return;
                    }
                    event.stopPropagation();
                    onAction?.(action);
                  }}
                  classNames='gap-2'
                  disabled={action.properties?.disabled}
                  {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                >
                  {action.properties?.icon && <Icon icon={action.properties?.icon} size={4} />}
                  <span className='grow truncate'>{toLocalizedString(action.properties!.label, t)}</span>
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
  menuActions,
  icon,
  label,
  testId,
  suppressNextTooltip,
  onAction,
}: Pick<
  NavTreeItemActionMenuProps,
  'icon' | 'menuActions' | 'testId' | 'label' | 'onAction' | 'suppressNextTooltip'
>) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const button = useRef<HTMLButtonElement | null>(null);

  // TODO(burdon): Optionally sort.
  const sortedActions = menuActions?.sort(({ properties: p1 }, { properties: p2 }) => {
    const t1 = toLocalizedString(p1!.label, t).toLowerCase();
    const t2 = toLocalizedString(p2!.label, t).toLowerCase();
    return t1.localeCompare(t2);
  });

  // TODO(thure): Use LayoutPlugin’s global Dialog.
  return (
    <Dialog.Root
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
      <Tooltip.Trigger asChild>
        <Dialog.Trigger asChild>
          <Button
            variant='ghost'
            density='fine'
            classNames={mx('shrink-0 !pli-2 pointer-fine:!pli-1', hoverableControlItem, hoverableOpenControlItem)}
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
            ref={button}
          >
            <Icon icon={icon ?? fallbackIcon} size={4} />
          </Button>
        </Dialog.Trigger>
      </Tooltip.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content classNames='z-[31] is-full max-is-[24rem] pli-2 plb-1'>
            <SearchList.Root label={t('tree item searchlist input placeholder')}>
              <SearchList.Input placeholder={t('tree item searchlist input placeholder')} classNames='pli-3' />
              <SearchList.Content classNames='min-bs-[12rem] bs-[50dvh] max-bs-[30rem] overflow-auto'>
                {sortedActions?.map((action) => {
                  const label = toLocalizedString(action.properties!.label, t);
                  const shortcut = getShortcut(action);
                  return (
                    <SearchList.Item
                      // TODO(burdon): Value should be id since label is not unique.
                      value={label}
                      key={action.id}
                      onSelect={() => {
                        if (action.properties?.disabled) {
                          return;
                        }
                        if (suppressNextTooltip) {
                          suppressNextTooltip.current = true;
                        }
                        setOptionsMenuOpen(false);
                        onAction?.(action);
                      }}
                      classNames='flex items-center gap-2 pli-2'
                      disabled={action.properties?.disabled}
                      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                    >
                      {action.properties?.icon && <Icon icon={action.properties?.icon} size={4} />}
                      <span className='grow truncate'>{label}</span>
                      {shortcut && (
                        <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>
                      )}
                    </SearchList.Item>
                  );
                })}
              </SearchList.Content>
              <div role='none' className='flex items-center plb-2 pli-3'>
                <span className={descriptionText}>{toLocalizedString(label, t)}</span>
              </div>
            </SearchList.Root>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const NavTreeItemMonolithicAction = ({
  parent,
  properties: { disabled, caller, testId, label, icon } = { label: 'never' },
  data: invoke,
}: Action & { parent: Node; onAction?: (action: Action) => void }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  return (
    <Tooltip.Trigger asChild>
      <Button
        variant='ghost'
        density='fine'
        classNames={mx('shrink-0 !pli-2 pointer-fine:!pli-1', hoverableControlItem, hoverableOpenControlItem)}
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }
          event.stopPropagation();
          void invoke?.(caller ? { node: parent, caller } : { node: parent });
        }}
        data-testid={testId}
      >
        <span className='sr-only'>{toLocalizedString(label, t)}</span>
        <Icon icon={icon ?? fallbackIcon} size={4} />
      </Button>
    </Tooltip.Trigger>
  );
};

export const NavTreeItemAction = ({ monolithic, menuActions, parent: node, ...props }: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const suppressNextTooltip = useRef<boolean>(false);
  const [triggerTooltipOpen, setTriggerTooltipOpen] = useState(false);

  const monolithicAction = menuActions?.length === 1 && menuActions[0];
  const baseLabel = toLocalizedString(monolithicAction ? monolithicAction.properties!.label : props.label, t);

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
      {baseLabel && (
        <Tooltip.Portal>
          <Tooltip.Content classNames='z-[31]' side='bottom'>
            {baseLabel}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      )}
      {monolithic && menuActions?.length === 1 ? (
        <NavTreeItemMonolithicAction parent={node} {...menuActions[0]} />
      ) : props.menuType === 'searchList' ? (
        <NavTreeItemActionSearchList
          {...props}
          menuActions={menuActions}
          suppressNextTooltip={suppressNextTooltip}
          onAction={(action) => action.data?.(props.caller ? { node, caller: props.caller } : { node })}
        />
      ) : (
        <NavTreeItemActionDropdownMenu
          {...props}
          parent={node}
          menuActions={menuActions}
          suppressNextTooltip={suppressNextTooltip}
          onAction={(action) => action.data?.(props.caller ? { node, caller: props.caller } : { node })}
        />
      )}
    </Tooltip.Root>
  );
};
