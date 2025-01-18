//
// Copyright 2023 DXOS.org
//

import React, { type MutableRefObject, useRef } from 'react';

import { type Action, type Node } from '@dxos/app-graph';
import { useTranslation, toLocalizedString, IconButton } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider, type MenuItem } from '@dxos/react-ui-menu';
import { hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';

import { NAVTREE_PLUGIN } from '../meta';
import { type ActionProperties } from '../types';

export type NavTreeItemActionMenuProps = ActionProperties & {
  parent: Node;
  caller?: string;
  monolithic?: boolean;
  menuActions?: Action[];
  suppressNextTooltip?: MutableRefObject<boolean>;
  onAction?: (action: Action) => void;
};

const fallbackIcon = 'ph--placeholder--regular';

const actionButtonProps = {
  iconOnly: true,
  size: 4 as const,
  variant: 'ghost' as const,
  density: 'fine' as const,
  classNames: mx('shrink-0 !pli-2 pointer-fine:!pli-1', hoverableControlItem, hoverableOpenControlItem),
};

export const NavTreeItemActionDropdownMenu = ({
  label,
  icon,
  testId,
  menuActions,
  onAction,
}: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const suppressNextTooltip = useRef<boolean>(false);
  return (
    <MenuProvider onAction={onAction}>
      <DropdownMenu.Root items={menuActions as MenuItem[]} suppressNextTooltip={suppressNextTooltip}>
        <DropdownMenu.Trigger asChild>
          <IconButton
            {...actionButtonProps}
            icon={icon ?? fallbackIcon}
            label={toLocalizedString(label, t)}
            data-testid={testId}
            suppressNextTooltip={suppressNextTooltip}
          />
        </DropdownMenu.Trigger>
      </DropdownMenu.Root>
    </MenuProvider>
  );
};

export const NavTreeItemMonolithicAction = ({
  parent,
  properties: { disabled, caller, testId, icon } = { label: 'never' },
  data: invoke,
  baseLabel,
}: Action & { parent: Node; onAction?: (action: Action) => void; baseLabel: string }) => {
  return (
    <IconButton
      {...actionButtonProps}
      icon={icon ?? fallbackIcon}
      label={baseLabel}
      disabled={disabled}
      onClick={(event) => {
        if (disabled) {
          return;
        }
        event.stopPropagation();
        void invoke?.(caller ? { node: parent, caller } : { node: parent });
      }}
      data-testid={testId}
    />
  );
};

export const NavTreeItemAction = ({ monolithic, menuActions, parent: node, ...props }: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const monolithicAction = menuActions?.length === 1 && menuActions[0];
  const baseLabel = toLocalizedString(monolithicAction ? monolithicAction.properties!.label : props.label, t);

  return monolithic && menuActions?.length === 1 ? (
    <NavTreeItemMonolithicAction baseLabel={baseLabel} parent={node} {...menuActions[0]} />
  ) : (
    <NavTreeItemActionDropdownMenu
      {...props}
      label={baseLabel}
      parent={node}
      menuActions={menuActions}
      onAction={(action) => action.data?.(props.caller ? { node, caller: props.caller } : { node })}
    />
  );
};
