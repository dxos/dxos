//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { type Node } from '@dxos/app-graph';
import { useActionRunner } from '@dxos/plugin-graph';
import { IconButton, toLocalizedString, useDensityContext, useTranslation } from '@dxos/react-ui';
import { Menu, type MenuItem } from '@dxos/react-ui-menu';
import { composable, composableProps, hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type ActionProperties } from '#types';

const fallbackIcon = 'ph--placeholder--regular';

const fineActionButtonProps = {
  size: 4 as const,
  density: 'fine' as const,
};

const coarseActionButtonProps = {
  size: 5 as const,
  density: 'coarse' as const,
};

export type NavTreeItemActionMenuProps = ActionProperties & {
  parent: Node.Node;
  path?: string[];
  caller?: string;
  monolithic?: boolean;
  menuActions?: Node.Action[];
};

export const NavTreeItemActionDropdownMenu = composable<HTMLButtonElement, NavTreeItemActionMenuProps>(
  ({ parent, path, label, icon, testId, menuActions, caller, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const density = useDensityContext();
    const runAction = useActionRunner();
    const handleAction = useCallback(
      (action: Node.Action, params: Node.InvokeProps = {}) => runAction(action, { ...params, path }),
      [runAction, path],
    );

    return (
      <Menu.Root caller={caller} onAction={handleAction}>
        <Menu.Trigger asChild>
          <IconButton
            {...(density === 'coarse' ? coarseActionButtonProps : fineActionButtonProps)}
            {...composableProps(props)}
            classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
            variant='ghost'
            icon={icon ?? fallbackIcon}
            iconOnly
            label={toLocalizedString(label, t)}
            data-testid={testId}
            ref={forwardedRef}
          />
        </Menu.Trigger>
        <Menu.Content group={parent} items={menuActions as MenuItem[]} />
      </Menu.Root>
    );
  },
);

NavTreeItemActionDropdownMenu.displayName = 'NavTreeItemActionDropdownMenu';

export const NavTreeItemMonolithicAction = (
  props: Node.Action & {
    parent: Node.Node;
    path?: string[];
    onAction?: (action: Node.Action) => void;
    baseLabel: string;
  },
) => {
  const {
    parent,
    path,
    properties: { disabled, caller, testId, icon, variant = 'ghost', iconOnly = true } = { label: 'never' },
    baseLabel,
  } = props;
  const density = useDensityContext();
  const runAction = useActionRunner();
  return (
    <IconButton
      {...(density === 'coarse' ? coarseActionButtonProps : fineActionButtonProps)}
      variant={variant}
      classNames={[
        'shrink-0',
        hoverableControlItem,
        hoverableOpenControlItem,
        iconOnly ? 'px-2 pointer-fine:px-1' : 'p-2 pointer-fine:p-2 me-1',
      ]}
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
  parent: node,
  path,
  ...props
}: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(meta.id);

  const monolithicAction = menuActions?.length === 1 && menuActions[0];
  const baseLabel = toLocalizedString(monolithicAction ? monolithicAction.properties!.label : props.label, t);

  return monolithic && menuActions?.length === 1 ? (
    <NavTreeItemMonolithicAction baseLabel={baseLabel} parent={node} path={path} {...menuActions[0]} />
  ) : (
    <NavTreeItemActionDropdownMenu {...props} label={baseLabel} parent={node} path={path} menuActions={menuActions} />
  );
};
