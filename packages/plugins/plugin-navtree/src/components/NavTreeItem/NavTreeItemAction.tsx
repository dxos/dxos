//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { ActionMenu, type MenuItem } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';
import { NavTreeNode } from '#types';

const fallbackIcon = 'ph--circle-dashed--regular';

export type NavTreeItemActionMenuProps = NavTreeNode.ActionProperties & {
  parent: AppGraphNode.Node;
  path?: string[];
  caller?: string;
  monolithic?: boolean;
  menuActions?: AppGraphNode.Action[];
};

export const NavTreeItemActionDropdownMenu = Util.composable<HTMLButtonElement, NavTreeItemActionMenuProps>(
  ({ parent, path, label, icon, testId, menuActions, caller, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const runAction = GraphHooks.useActionRunner();
    const handleAction = useCallback(
      (action: AppGraphNode.Action, params: AppGraphNode.InvokeProps = {}) => runAction(action, { ...params, path }),
      [runAction, path],
    );

    return (
      <ActionMenu caller={caller} onAction={handleAction} group={parent} actions={menuActions as MenuItem[]}>
        <Button.Button
          {...props}
          classNames='shrink-0 px-2 pointer-fine:px-1'
          variant='ghost'
          icon={icon ?? fallbackIcon}
          iconOnly
          label={ThemeProvider.toLocalizedString(label, t)}
          data-testid={testId}
          // The tree selects a row on any click inside it, and selecting navigates away from the
          // menu just opened. The trigger has handled the click by the time this runs.
          onClick={(event) => event.stopPropagation()}
          ref={forwardedRef}
        />
      </ActionMenu>
    );
  },
);

NavTreeItemActionDropdownMenu.displayName = 'NavTreeItemActionDropdownMenu';

export const NavTreeItemMonolithicAction = (
  props: AppGraphNode.Action & {
    parent: AppGraphNode.Node;
    path?: string[];
    onAction?: (action: AppGraphNode.Action) => void;
    baseLabel: string;
  },
) => {
  const {
    parent,
    path,
    properties: { disabled, caller, testId, icon, variant = 'ghost', iconOnly = true } = { label: 'never' },
    baseLabel,
  } = props;
  const runAction = GraphHooks.useActionRunner();
  return (
    <Button.Button
      variant={variant}
      classNames={['shrink-0', iconOnly ? 'px-2 pointer-fine:px-1' : 'p-2 pointer-fine:p-2 me-1']}
      icon={icon ?? fallbackIcon}
      iconOnly={iconOnly}
      label={baseLabel}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) {
          return;
        }

        void runAction(props, caller ? { parent, caller, path } : { parent, path });
      }}
      data-testid={testId}
    />
  );
};

export const NavTreeItemAction = ({
  monolithic,
  menuActions,
  menuType,
  parent,
  path,
  ...props
}: NavTreeItemActionMenuProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  const monolithicAction = menuActions?.length === 1 && menuActions[0];
  const baseLabel = ThemeProvider.toLocalizedString(
    monolithicAction ? monolithicAction.properties!.label : props.label,
    t,
  );
  return monolithic && menuActions?.length === 1 ? (
    <NavTreeItemMonolithicAction baseLabel={baseLabel} parent={parent} path={path} {...menuActions[0]} />
  ) : (
    <NavTreeItemActionDropdownMenu {...props} label={baseLabel} parent={parent} path={path} menuActions={menuActions} />
  );
};
