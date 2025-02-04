//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { type Node, isAction } from '@dxos/app-graph';
import { Popover, toLocalizedString, Treegrid, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { NAV_TREE_ITEM } from './NavTree';
import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemAction } from './NavTreeItemAction';
import type { NavTreeColumnsProps } from './types';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { l0ItemType } from '../util';

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

type L1PanelProps = { item: Node<any>; currentItemId: string };

const L1Panel = ({ item, currentItemId }: L1PanelProps) => {
  const navTreeContext = useNavTreeContext();
  console.log('[L1Panel]', item.id, currentItemId);
  return (
    <Tabs.Tabpanel key={item.id} value={item.id}>
      {item.id === currentItemId && (
        <Tree
          {...navTreeContext}
          id={item.id}
          root={item}
          draggable
          gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
          renderColumns={NavTreeColumns}
        />
      )}
    </Tabs.Tabpanel>
  );
};

const L1PanelCollection = ({ item, currentItemId }: L1PanelProps) => {
  const { getItems } = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = getItems(item);
  return (
    <>
      {collectionItems
        .filter((item) => l0ItemType(item) === 'tab')
        .map((item) => (
          <L1Panel key={item.id} item={item} currentItemId={currentItemId} />
        ))}
    </>
  );
};

export const L1Panels = ({ topLevelItems, currentItemId }: { topLevelItems: Node<any>[]; currentItemId: string }) => {
  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        switch (type) {
          case 'collection':
            return <L1PanelCollection key={item.id} item={item} currentItemId={currentItemId} />;
          case 'tab':
            return <L1Panel key={item.id} item={item} currentItemId={currentItemId} />;
          default:
            return null;
        }
      })}
    </>
  );
};
