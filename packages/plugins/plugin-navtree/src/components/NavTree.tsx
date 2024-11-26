//
// Copyright 2024 DXOS.org
//

import React, { Fragment, useCallback, useEffect, type FC } from 'react';

import { isAction, type Node } from '@dxos/app-graph';
import { Popover, toLocalizedString, Treegrid, useTranslation } from '@dxos/react-ui';
import { Tree, type TreeProps } from '@dxos/react-ui-list';
import { type MaybePromise } from '@dxos/util';

import { NavTreeItemAction } from './NavTreeItemAction';
import { NAVTREE_PLUGIN } from '../meta';
import { type FlattenedActions, type NavTreeItemGraphNode } from '../types';

export const NAV_TREE_ITEM = 'NavTreeItem';

export type NavTreeProps = Omit<
  TreeProps<NavTreeItemGraphNode>,
  'draggable' | 'gridTemplateColumns' | 'renderColumns'
> &
  Pick<NavTreeColumnsProps, 'getActions' | 'loadDescendents' | 'renderPresence' | 'popoverAnchorId'>;

export const NavTree = ({ getActions, loadDescendents, renderPresence, popoverAnchorId, ...props }: NavTreeProps) => {
  const renderColumns = useCallback<NonNullable<TreeProps<NavTreeItemGraphNode>['renderColumns']>>(
    ({ item, path, menuOpen, setMenuOpen }) => {
      return (
        <NavTreeColumns
          path={path}
          node={item}
          getActions={getActions}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          loadDescendents={loadDescendents}
          renderPresence={renderPresence}
          popoverAnchorId={popoverAnchorId}
        />
      );
    },
    [renderPresence, popoverAnchorId, loadDescendents],
  );

  return (
    <Tree
      {...props}
      draggable
      gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
      renderColumns={renderColumns}
    />
  );
};

type NavTreeColumnsProps = {
  path: string[];
  node: Node;
  getActions: (node: Node) => FlattenedActions;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  loadDescendents?: (node: Node) => MaybePromise<void>;
  renderPresence?: FC<{ node: Node }>;
  popoverAnchorId?: string;
};

const NavTreeColumns = ({
  path,
  node,
  getActions,
  menuOpen,
  setMenuOpen,
  loadDescendents,
  renderPresence: Presence,
  popoverAnchorId,
}: NavTreeColumnsProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const level = path.length - 2;

  const { actions: _actions, groupedActions } = getActions(node);
  const [primaryAction, ...secondaryActions] = _actions.toSorted((a, b) =>
    a.properties?.disposition === 'toolbar' ? -1 : 1,
  );

  const actions = (primaryAction?.properties?.disposition === 'toolbar' ? secondaryActions : _actions)
    .flatMap((action) => (isAction(action) ? [action] : []))
    .filter((action) => !action.properties?.hidden);

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${node.id}` ? Popover.Anchor : Fragment;

  // TODO(thure): Ideally this should not be necessary.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadDescendents?.(node);
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
          parent={node}
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
            parent={node}
            menuActions={actions}
            menuType='dropdown'
            caller={NAV_TREE_ITEM}
            menuOpen={menuOpen}
            onChangeMenuOpen={setMenuOpen}
          />
        ) : (
          <Treegrid.Cell />
        )}
      </ActionRoot>
      {Presence && <Presence node={node} />}
    </>
  );
};
