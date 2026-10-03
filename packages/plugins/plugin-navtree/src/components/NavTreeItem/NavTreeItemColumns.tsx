//
// Copyright 2025 DXOS.org
//

import React, { Fragment, memo, useMemo } from 'react';

import { Tree } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { getListActions, useActions } from '#hooks';
import { meta } from '#meta';

import { NAV_TREE_ITEM } from '../NavTree/index.ts';
import { useNavTreeContext } from '../NavTreeContext/index.ts';
import { type NavTreeItemColumnsProps } from '../types.ts';
import { NavTreeItemActionDropdownMenu, NavTreeItemMonolithicAction } from './NavTreeItemAction.tsx';

export const NavTreeItemColumns = memo(({ path, item, open }: NavTreeItemColumnsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { renderItemEnd: ItemEnd, popoverAnchorId } = useNavTreeContext();

  const level = path.length - 2;
  const flattenedActions = useActions(item);
  const allActions = useMemo(() => getListActions(flattenedActions), [flattenedActions]);

  const anchored = popoverAnchorId === `${NAV_TREE_ITEM}:${item.id}`;
  const ActionRoot = anchored ? Popover.Anchor : Fragment;

  return (
    // `data-popover-anchor` lets the enclosing row highlight itself while a popover (e.g. rename) is open on it.
    // The empty div holds the actions track when the item has no actions.
    <div className='contents dx-app-no-drag' {...(anchored && { 'data-popover-anchor': '' })}>
      <Tree.ItemActions>
        <ActionRoot>
          {allActions.length === 1 ? (
            <NavTreeItemMonolithicAction
              baseLabel={ThemeProvider.toLocalizedString(allActions[0].properties?.label, t)}
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
      </Tree.ItemActions>
      {ItemEnd && <ItemEnd node={item} open={open} />}
    </div>
  );
});
