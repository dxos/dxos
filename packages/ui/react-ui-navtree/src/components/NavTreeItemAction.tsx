//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type MutableRefObject, type PropsWithChildren, useRef, useState } from 'react';

import { keySymbols } from '@dxos/keyboard';
import { Button, Dialog, DropdownMenu, ContextMenu, Tooltip, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { type MosaicActiveType, useMosaic } from '@dxos/react-ui-mosaic';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, getSize, hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { translationKey } from '../translations';
import { type NavTreeActionNode as NavTreeItemActionNode, type NavTreeActionProperties } from '../types';

export type NavTreeItemActionMenuProps = NavTreeActionProperties & {
  menuActions?: NavTreeItemActionNode[];
  active?: MosaicActiveType;
  suppressNextTooltip?: MutableRefObject<boolean>;
  menuOpen?: boolean;
  defaultMenuOpen?: boolean;
  onChangeMenuOpen?: (nextOpen: boolean) => void;
  onAction?: (action: NavTreeItemActionNode) => void;
};

const getShortcut = (action: NavTreeItemActionNode) => {
  return typeof action.properties?.keyBinding === 'string'
    ? action.properties.keyBinding
    : action.properties?.keyBinding?.[getHostPlatform()];
};

export const NavTreeItemActionDropdownMenu = ({
  active,
  label,
  iconSymbol,
  testId,
  menuActions,
  suppressNextTooltip,
  menuOpen,
  defaultMenuOpen,
  onChangeMenuOpen,
  onAction,
}: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(translationKey);

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
            classNames={[
              'shrink-0 !pli-2 pointer-fine:!pli-1',
              hoverableControlItem,
              hoverableOpenControlItem,
              active === 'overlay' && 'invisible',
            ]}
            data-testid={testId}
            aria-label={t('tree item actions label')}
          >
            <span className='sr-only'>{toLocalizedString(label, t)}</span>
            <svg className={getSize(4)}>
              <use href={`/icons.svg#${iconSymbol}`} />
            </svg>
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
                  {action.properties?.iconSymbol && (
                    <svg className={mx(getSize(4), 'shrink-0')}>
                      <use href={`/icons.svg#${action.properties!.iconSymbol}`} />
                    </svg>
                  )}
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
  const { t } = useTranslation(translationKey);
  const { activeItem } = useMosaic();

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        {/* ContextMenu’s `open` state is not controllable, so if it happens to be/become open during dragging, the best we can do is hide it. */}
        <ContextMenu.Content classNames={mx('z-[31]', activeItem && 'hidden')}>
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
                  {action.properties?.iconSymbol && (
                    <svg className={mx(getSize(4), 'shrink-0')}>
                      <use href={`/icons.svg#${action.properties?.iconSymbol}`} />
                    </svg>
                  )}
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
  iconSymbol,
  active,
  label,
  testId,
  suppressNextTooltip,
  onAction,
}: Pick<
  NavTreeItemActionMenuProps,
  'iconSymbol' | 'menuActions' | 'testId' | 'active' | 'label' | 'onAction' | 'suppressNextTooltip'
>) => {
  const { t } = useTranslation(translationKey);

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
            classNames={[
              'shrink-0 !pli-2 pointer-fine:!pli-1',
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
            ref={button}
          >
            <svg className={getSize(4)}>
              <use href={`/icons.svg#${iconSymbol}`} />
            </svg>
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
                      {action.properties?.iconSymbol && (
                        <svg className={mx(getSize(4), 'shrink-0')}>
                          <use href={`/icons.svg#${action.properties?.iconSymbol}`} />
                        </svg>
                      )}
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
  active,
  properties: { disabled, caller, testId, label, iconSymbol } = { label: 'never' },
  data: invoke,
}: NavTreeItemActionNode & { active?: MosaicActiveType; onAction?: (action: NavTreeItemActionNode) => void }) => {
  const { t } = useTranslation(translationKey);
  return (
    <Tooltip.Trigger asChild>
      <Button
        variant='ghost'
        density='fine'
        classNames={[
          'shrink-0 !pli-2 pointer-fine:!pli-1',
          hoverableControlItem,
          hoverableOpenControlItem,
          active === 'overlay' && 'invisible',
        ]}
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }
          event.stopPropagation();
          void invoke?.(caller ? { caller } : {});
        }}
        data-testid={testId}
      >
        <span className='sr-only'>{toLocalizedString(label, t)}</span>
        <svg className={getSize(4)}>
          <use href={`/icons.svg#${iconSymbol}`} />
        </svg>
      </Button>
    </Tooltip.Trigger>
  );
};

export const NavTreeItemAction = (props: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(translationKey);
  const suppressNextTooltip = useRef<boolean>(false);
  const [triggerTooltipOpen, setTriggerTooltipOpen] = useState(false);

  const monolithicAction = props.menuActions?.length === 1 && props.menuActions[0];
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
      {monolithicAction ? (
        <NavTreeItemMonolithicAction {...monolithicAction} />
      ) : props.menuType === 'searchList' ? (
        <NavTreeItemActionSearchList
          {...props}
          suppressNextTooltip={suppressNextTooltip}
          onAction={(action) => action.data?.(props.caller ? { caller: props.caller } : {})}
        />
      ) : (
        <NavTreeItemActionDropdownMenu
          {...props}
          suppressNextTooltip={suppressNextTooltip}
          onAction={(action) => action.data?.(props.caller ? { caller: props.caller } : {})}
        />
      )}
    </Tooltip.Root>
  );
};
