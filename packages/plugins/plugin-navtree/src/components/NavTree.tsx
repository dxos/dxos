//
// Copyright 2024 DXOS.org
//

import React, { Fragment, useEffect } from 'react';

import { isAction } from '@dxos/app-graph';
import { Popover, toLocalizedString, Treegrid, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';

import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemAction } from './NavTreeItemAction';
import { type NavTreeColumnsProps, type NavTreeProps } from './types';
import { NAVTREE_PLUGIN } from '../meta';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTree = (props: NavTreeProps) => {
  const { getItems, getProps, isCurrent, canDrop, onSelect } = useNavTreeContext();
  return (
    <Tree
      {...props}
      getItems={getItems}
      getProps={getProps}
      isCurrent={isCurrent}
      canDrop={canDrop}
      onSelect={onSelect}
      draggable
      gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
      renderColumns={NavTreeColumns}
    />
  );
};

const NavTreeColumns = ({ path, item, open }: NavTreeColumnsProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { getActions, loadDescendents, renderItemEnd: ItemEnd, popoverAnchorId } = useNavTreeContext();

  const level = path.length - 2;

  const { actions: _actions, groupedActions } = getActions(item);
  const [primaryAction, ...secondaryActions] = _actions.toSorted((a, b) =>
    a.properties?.disposition === 'toolbar' ? -1 : 1,
  );

  const actions = (primaryAction?.properties?.disposition === 'toolbar' ? secondaryActions : _actions)
    .flatMap((action) => (isAction(action) ? [action] : []))
    .filter((action) => !action.properties?.hidden);

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${item.id}` ? Popover.Anchor : Fragment;

  // TODO(thure): Ideally this should not be necessary.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadDescendents?.(item);
      if (primaryAction && !isAction(primaryAction)) {
        void loadDescendents?.(primaryAction);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [primaryAction]);

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
};
