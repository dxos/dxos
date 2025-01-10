//
// Copyright 2023 DXOS.org
//

import React, { type MutableRefObject, useRef, useState } from 'react';

import { type Action, type Node } from '@dxos/app-graph';
import { Button, Tooltip, useTranslation, toLocalizedString, Icon, IconButton } from '@dxos/react-ui';
import { DropdownMenu, type MenuAction } from '@dxos/react-ui-menu';
import { hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';

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

const fallbackIcon = 'ph--placeholder--regular';

export const NavTreeItemActionDropdownMenu = ({
  label,
  icon,
  testId,
  menuActions,
  ...menuProps
}: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  return (
    <DropdownMenu.Root actions={menuActions as MenuAction[]} {...menuProps}>
      <Tooltip.Trigger asChild>
        <DropdownMenu.Trigger asChild>
          <IconButton
            variant='ghost'
            density='fine'
            classNames={mx('shrink-0 !pli-2 pointer-fine:!pli-1', hoverableControlItem, hoverableOpenControlItem)}
            data-testid={testId}
            label={t('tree item actions label')}
            icon={icon ?? fallbackIcon}
            size={4}
          />
        </DropdownMenu.Trigger>
      </Tooltip.Trigger>
    </DropdownMenu.Root>
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
