//
// Copyright 2024 DXOS.org
//

import React, { Fragment, useCallback, useState } from 'react';

import { isAction } from '@dxos/app-graph';
import { Popover, toLocalizedString, Treegrid, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemAction } from './NavTreeItemAction';
import { type NavTreeColumnsProps, type NavTreeProps } from './types';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTree = (props: NavTreeProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const navTreeContext = useNavTreeContext();
  const topLevelItems = navTreeContext.getItems();
  const [currentItem, setCurrentItem] = useState(topLevelItems[0] ?? { id: 'never' });
  const handleChange = useCallback(
    (nextId: string) => setCurrentItem(topLevelItems.find((item) => item.id === nextId) ?? topLevelItems[0]),
    [topLevelItems],
  );

  useLoadDescendents(props.root);

  return (
    <Tabs.Root value={currentItem.id} onValueChange={handleChange} orientation='vertical'>
      <Tabs.Tablist>
        {topLevelItems.map((item) => (
          <Tabs.Tab key={item.id} value={item.id}>
            {toLocalizedString(item.properties?.label, t)}
          </Tabs.Tab>
        ))}
      </Tabs.Tablist>
      {topLevelItems.map((item) => (
        <Tabs.Tabpanel key={item.id} value={item.id}>
          {item.id === currentItem.id && (
            <Tree
              {...props}
              {...navTreeContext}
              id={item.id}
              root={item}
              draggable
              gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
              renderColumns={NavTreeColumns}
            />
          )}
        </Tabs.Tabpanel>
      ))}
    </Tabs.Root>
  );
};

const NavTreeColumns = ({ path, item, open }: NavTreeColumnsProps) => {
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
};
