//
// Copyright 2025 DXOS.org
//

import React, { Fragment, memo, useMemo } from 'react';

import { Node } from '@dxos/app-graph';
import { Popover, Treegrid, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { useActions } from '../../hooks';
import { meta } from '../../meta';
import { NAV_TREE_ITEM } from '../NavTree';
import { useNavTreeContext } from '../NavTreeContext';
import { type NavTreeItemColumnsProps } from '../types';

import { NavTreeItemAction } from './NavTreeItemAction';

export const NavTreeItemColumns = memo(({ path, item, open }: NavTreeItemColumnsProps) => {
  const { t } = useTranslation(meta.id);
  const { renderItemEnd: ItemEnd, popoverAnchorId } = useNavTreeContext();

  const level = path.length - 2;
  const { actions: actionsProp, groupedActions } = useActions(item);
  const sortedActions = useMemo(
    () =>
      actionsProp.toSorted((actionA, actionB) => {
        const primaryA = actionA.properties?.disposition === 'list-item-primary';
        const primaryB = actionB.properties?.disposition === 'list-item-primary';
        if (primaryA && !primaryB) {
          return -1;
        }
        if (primaryB && !primaryA) {
          return 1;
        }
        return 0;
      }),
    [actionsProp],
  );
  const [primaryAction, ...secondaryActions] = sortedActions;

  const actions = useMemo(
    () =>
      (primaryAction?.properties?.disposition === 'list-item-primary' ? secondaryActions : sortedActions)
        .flatMap((action) => (Node.isAction(action) ? [action] : []))
        .filter((a) => ['list-item', 'list-item-primary'].includes(a.properties?.disposition)),
    [sortedActions, primaryAction],
  );

  const primaryMenuActions = useMemo(
    () =>
      primaryAction
        ? Node.isAction(primaryAction)
          ? [primaryAction]
          : groupedActions[primaryAction?.id ?? '']
        : undefined,
    [primaryAction, groupedActions],
  );

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${item.id}` ? Popover.Anchor : Fragment;

  return (
    <div role='none' className='contents dx-app-no-drag'>
      {primaryAction?.properties?.disposition === 'list-item-primary' && !primaryAction?.properties?.disabled ? (
        <Treegrid.Cell classNames='contents'>
          <NavTreeItemAction
            testId={primaryAction.properties?.testId}
            label={toLocalizedString(primaryAction.properties?.label, t)}
            icon={primaryAction.properties?.icon ?? 'ph--placeholder--regular'}
            parent={item}
            monolithic={Node.isAction(primaryAction)}
            menuActions={primaryMenuActions}
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
