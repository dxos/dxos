//
// Copyright 2025 DXOS.org
//

import React, { Fragment, memo } from 'react';

import { isAction } from '@dxos/app-graph';
import { Popover, toLocalizedString, Treegrid, useTranslation } from '@dxos/react-ui';

import { NAV_TREE_ITEM } from './NavTree';
import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemAction } from './NavTreeItemAction';
import type { NavTreeItemColumnsProps } from './types';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';

export const NavTreeItemColumns = memo(({ path, item, open }: NavTreeItemColumnsProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { getActions, renderItemEnd: ItemEnd, popoverAnchorId } = useNavTreeContext();

  const level = path.length - 2;

  const { actions: _actions, groupedActions } = getActions(item);
  const [primaryAction, ...secondaryActions] = _actions.toSorted((a, b) =>
    a.properties?.disposition === 'toolbar' ? -1 : 1,
  );

  const actions = (primaryAction?.properties?.disposition === 'toolbar' ? secondaryActions : _actions)
    .flatMap((action) => (isAction(action) ? [action] : []))
    .filter((action) => !action.properties?.hidden);

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${item.id}` ? Popover.Anchor : Fragment;

  useLoadDescendents(item);
  useLoadDescendents(primaryAction && !isAction(primaryAction) ? primaryAction : undefined);

  return (
    <>
      {primaryAction?.properties?.disposition === 'toolbar' ? (
        <NavTreeItemAction
          testId={primaryAction.properties?.testId}
          label={toLocalizedString(primaryAction.properties?.label, t)}
          icon={primaryAction.properties?.icon ?? 'ph--placeholder--regular'}
          parent={item}
          monolithic={isAction(primaryAction)}
          menuActions={isAction(primaryAction) ? [primaryAction] : groupedActions[primaryAction.id]}
          menuType={primaryAction.properties?.menuType}
          caller={NAV_TREE_ITEM}
        />
      ) : (
        <Treegrid.Cell />
      )}
      <ActionRoot>
        {actions.length > 0 ? (
          <NavTreeItemAction
            testId={`navtree.treeItem.actionsLevel${level}`}
            label={t('tree item actions label')}
            icon='ph--dots-three-vertical--regular'
            parent={item}
            menuActions={actions}
            menuType='dropdown'
            caller={NAV_TREE_ITEM}
          />
        ) : (
          <Treegrid.Cell />
        )}
      </ActionRoot>
      {ItemEnd && <ItemEnd node={item} open={open} />}
    </>
  );
});
