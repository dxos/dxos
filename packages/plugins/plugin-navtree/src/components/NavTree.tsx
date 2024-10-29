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
import { type NavTreeItem } from '../types';

export const NAV_TREE_ITEM = 'NavTreeItem';

export type NavTreeProps = Omit<TreeProps<NavTreeItem>, 'draggable' | 'gridTemplateColumns' | 'renderColumns'> &
  Pick<NavTreeColumnsProps, 'loadDescendents' | 'renderPresence' | 'popoverAnchorId'>;

export const NavTree = ({ loadDescendents, renderPresence, popoverAnchorId, ...props }: NavTreeProps) => {
  const renderColumns = useCallback<NonNullable<TreeProps<NavTreeItem>['renderColumns']>>(
    ({ item, menuOpen, setMenuOpen }) => {
      return (
        <NavTreeColumns
          item={item}
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
    <Tree<NavTreeItem>
      {...props}
      draggable
      gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
      renderColumns={renderColumns}
    />
  );
};

type NavTreeColumnsProps = {
  item: NavTreeItem;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  loadDescendents?: (node: Node) => MaybePromise<void>;
  renderPresence?: FC<{ item: NavTreeItem }>;
  popoverAnchorId?: string;
};

const NavTreeColumns = ({
  item,
  menuOpen,
  setMenuOpen,
  loadDescendents,
  renderPresence: Presence,
  popoverAnchorId,
}: NavTreeColumnsProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const level = item.path.length - 2;

  const [primaryAction, ...secondaryActions] = item.actions.toSorted((a, b) =>
    a.properties?.disposition === 'toolbar' ? -1 : 1,
  );

  const actions = (primaryAction?.properties?.disposition === 'toolbar' ? secondaryActions : item.actions)
    .flatMap((action) => (isAction(action) ? [action] : []))
    .filter((action) => !action.properties?.hidden);

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${item.id}` ? Popover.Anchor : Fragment;

  // TODO(thure): Ideally this should not be necessary.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadDescendents?.(item.node);
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
          parent={item.node}
          monolithic={isAction(primaryAction)}
          menuActions={isAction(primaryAction) ? [primaryAction] : item.groupedActions[primaryAction.id]}
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
            parent={item.node}
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
      {Presence && <Presence item={item} />}
    </>
  );
};
