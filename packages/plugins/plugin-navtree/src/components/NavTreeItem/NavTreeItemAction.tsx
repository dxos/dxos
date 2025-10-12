//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Action, type Node } from '@dxos/app-graph';
import { IconButton, toLocalizedString, useDensityContext, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, type MenuItem, MenuProvider } from '@dxos/react-ui-menu';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/react-ui-theme';

import { meta } from '../../meta';
import { type ActionProperties } from '../../types';

export type NavTreeItemActionMenuProps = ActionProperties & {
  parent: Node;
  caller?: string;
  monolithic?: boolean;
  menuActions?: Action[];
};

const fallbackIcon = 'ph--placeholder--regular';

const fineActionButtonProps = {
  size: 4 as const,
  density: 'fine' as const,
};
const coarseActionButtonProps = {
  size: 5 as const,
  density: 'coarse' as const,
};

export const NavTreeItemActionDropdownMenu = ({
  parent,
  label,
  icon,
  testId,
  menuActions,
  caller,
}: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(meta.id);
  const density = useDensityContext();
  return (
    <MenuProvider>
      <DropdownMenu.Root group={parent} items={menuActions as MenuItem[]} caller={caller}>
        <DropdownMenu.Trigger asChild>
          <IconButton
            {...(density === 'coarse' ? coarseActionButtonProps : fineActionButtonProps)}
            classNames={['shrink-0 pli-2 pointer-fine:pli-1', hoverableControlItem, hoverableOpenControlItem]}
            variant='ghost'
            icon={icon ?? fallbackIcon}
            iconOnly
            label={toLocalizedString(label, t)}
            data-testid={testId}
          />
        </DropdownMenu.Trigger>
      </DropdownMenu.Root>
    </MenuProvider>
  );
};

export const NavTreeItemMonolithicAction = ({
  parent,
  properties: { disabled, caller, testId, icon, variant = 'ghost', iconOnly = true } = { label: 'never' },
  data: invoke,
  baseLabel,
}: Action & { parent: Node; onAction?: (action: Action) => void; baseLabel: string }) => {
  const density = useDensityContext();
  return (
    <IconButton
      {...(density === 'coarse' ? coarseActionButtonProps : fineActionButtonProps)}
      variant={variant}
      classNames={[
        'shrink-0',
        hoverableControlItem,
        hoverableOpenControlItem,
        iconOnly ? 'pli-2 pointer-fine:pli-1' : 'p-2 pointer-fine:p-2 mie-1',
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

        void invoke?.(caller ? { parent, caller } : { parent });
      }}
      data-testid={testId}
    />
  );
};

export const NavTreeItemAction = ({ monolithic, menuActions, parent: node, ...props }: NavTreeItemActionMenuProps) => {
  const { t } = useTranslation(meta.id);

  const monolithicAction = menuActions?.length === 1 && menuActions[0];
  const baseLabel = toLocalizedString(monolithicAction ? monolithicAction.properties!.label : props.label, t);

  return monolithic && menuActions?.length === 1 ? (
    <NavTreeItemMonolithicAction baseLabel={baseLabel} parent={node} {...menuActions[0]} />
  ) : (
    <NavTreeItemActionDropdownMenu {...props} label={baseLabel} parent={node} menuActions={menuActions} />
  );
};
