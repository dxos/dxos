//
// Copyright 2025 DXOS.org
//

import React, { Fragment, memo } from 'react';

import { isAction } from '@dxos/app-graph';
import { Popover, Treegrid, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { useLoadDescendents } from '../../hooks';
import { meta } from '../../meta';
import { NAV_TREE_ITEM } from '../NavTree';
import { useNavTreeContext } from '../NavTreeContext';
import { type NavTreeItemColumnsProps } from '../types';

import { NavTreeItemAction } from './NavTreeItemAction';

export const NavTreeItemColumns = memo(({ path, item, open }: NavTreeItemColumnsProps) => {
  const { t } = useTranslation(meta.id);
  const { useActions, renderItemEnd: ItemEnd, popoverAnchorId } = useNavTreeContext();

  const level = path.length - 2;
  const { actions: _actions, groupedActions } = useActions(item);
  const [primaryAction, ...secondaryActions] = _actions.toSorted((a, _b) =>
    a.properties?.disposition === 'list-item-primary' ? -1 : 1,
  );

  const actions = (primaryAction?.properties?.disposition === 'list-item-primary' ? secondaryActions : _actions)
    .flatMap((action) => (isAction(action) ? [action] : []))
    .filter((a) => ['list-item', 'list-item-primary'].includes(a.properties?.disposition));

  useLoadDescendents(item);
  useLoadDescendents(primaryAction && !isAction(primaryAction) ? primaryAction : undefined);

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${item.id}` ? Popover.Anchor : Fragment;

  return (
    <div role='none' className='contents app-no-drag'>
      {primaryAction?.properties?.disposition === 'list-item-primary' && !primaryAction?.properties?.disabled ? (
        <Treegrid.Cell classNames='contents'>
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
        </Treegrid.Cell>
      ) : (
        <Treegrid.Cell role='none' />
      )}
      <ActionRoot>
        {actions.length > 0 ? (
          <Treegrid.Cell classNames='contents'>
            <NavTreeItemAction
              testId={`navtree.treeItem.actionsLevel${level}`}
              label={t('tree item actions label')}
              icon='ph--dots-three-vertical--regular'
              parent={item}
              menuActions={actions}
              menuType='dropdown'
              caller={NAV_TREE_ITEM}
            />
          </Treegrid.Cell>
        ) : (
          <Treegrid.Cell role='none' />
        )}
      </ActionRoot>
      {ItemEnd && (
        <Treegrid.Cell classNames='contents'>
          <ItemEnd node={item} open={open} />
        </Treegrid.Cell>
      )}
    </div>
  );
});
