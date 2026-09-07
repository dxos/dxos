//
// Copyright 2025 DXOS.org
//

import React, { Fragment, memo, useMemo } from 'react';

import { Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { getListActions, useActions } from '#hooks';
import { meta } from '#meta';

import { NAV_TREE_ITEM } from '../NavTree';
import { useNavTreeContext } from '../NavTreeContext';
import { type NavTreeItemColumnsProps } from '../types';
import { NavTreeItemActionDropdownMenu, NavTreeItemMonolithicAction } from './NavTreeItemAction';

export const NavTreeItemColumns = memo(({ path, item, open }: NavTreeItemColumnsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { renderItemEnd: ItemEnd, popoverAnchorId } = useNavTreeContext();

  const level = path.length - 2;
  const flattenedActions = useActions(item);
  const allActions = useMemo(() => getListActions(flattenedActions), [flattenedActions]);

  const anchored = popoverAnchorId === `${NAV_TREE_ITEM}:${item.id}`;
  const ActionRoot = anchored ? Popover.Anchor : Fragment;

  return (
    // `data-popover-anchor` lets the enclosing row highlight itself while a popover (e.g. rename) is open on it.
    // The enclosing row is an ARIA `treeitem`, not a grid row, so these columns carry no `gridcell` role —
    // the empty div is a subgrid spacer holding the actions column when the item has no actions.
    <div className='contents dx-app-no-drag' {...(anchored && { 'data-popover-anchor': '' })}>
      <ActionRoot>
        {allActions.length === 1 ? (
          <NavTreeItemMonolithicAction
            baseLabel={toLocalizedString(allActions[0].properties?.label, t)}
            parent={item}
            path={path}
            {...allActions[0]}
          />
        ) : allActions.length > 1 ? (
          <NavTreeItemActionDropdownMenu
            testId={`navtree.treeItem.actionsLevel${level}`}
            label={t('tree-item-actions.label')}
            icon='ph--dots-three-vertical--regular'
            parent={item}
            path={path}
            menuActions={allActions}
            caller={NAV_TREE_ITEM}
          />
        ) : (
          <div />
        )}
      </ActionRoot>
      {ItemEnd && <ItemEnd node={item} open={open} />}
    </div>
  );
});
