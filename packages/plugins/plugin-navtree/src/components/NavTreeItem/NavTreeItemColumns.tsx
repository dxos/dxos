//
// Copyright 2025 DXOS.org
//

import React, { Fragment, memo } from 'react';

import { isAction } from '@dxos/app-graph';
import { DensityProvider, Popover, toLocalizedString, Treegrid, useTranslation } from '@dxos/react-ui';

import { NavTreeItemAction } from './NavTreeItemAction';
import { useLoadDescendents } from '../../hooks';
import { NAVTREE_PLUGIN } from '../../meta';
import { NAV_TREE_ITEM } from '../NavTree';
import { useNavTreeContext } from '../NavTreeContext';
import type { NavTreeItemColumnsProps } from '../types';

export const NavTreeItemColumns = memo(({ path, item, open, density = 'fine' }: NavTreeItemColumnsProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { getActions, renderItemEnd: ItemEnd, popoverAnchorId } = useNavTreeContext();

  const level = path.length - 2;

  const { actions: _actions, groupedActions } = getActions(item);
  const [primaryAction, ...secondaryActions] = _actions.toSorted((a, b) =>
    a.properties?.disposition === 'list-item-primary' ? -1 : 1,
  );

  const actions = (primaryAction?.properties?.disposition === 'list-item-primary' ? secondaryActions : _actions)
    .flatMap((action) => (isAction(action) ? [action] : []))
    .filter((a) => ['list-item', 'list-item-primary'].includes(a.properties?.disposition));

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${item.id}` ? Popover.Anchor : Fragment;

  useLoadDescendents(item);
  useLoadDescendents(primaryAction && !isAction(primaryAction) ? primaryAction : undefined);

  return (
    <DensityProvider density={density}>
      <div role='none' className='contents app-no-drag'>
        {primaryAction?.properties?.disposition === 'list-item-primary' && !primaryAction?.properties?.disabled ? (
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
      </div>
    </DensityProvider>
  );
});
