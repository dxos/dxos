//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { Fragment } from 'react';

import { Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { NavTreeItemAction, type TreeNode } from '@dxos/react-ui-navtree';

import { KEY_BINDING, NAVTREE_PLUGIN } from '../meta';

const TREE_ITEM_MAIN_HEADING = 'TreeItemMainHeading';

export const NavBarStart = ({ activeNode, popoverAnchorId }: { activeNode: TreeNode; popoverAnchorId?: string }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const ActionRoot =
    popoverAnchorId === `dxos.org/ui/${TREE_ITEM_MAIN_HEADING}/${activeNode.id}` ||
    popoverAnchorId === `dxos.org/ui/${KEY_BINDING}/${activeNode.id}`
      ? Popover.Anchor
      : Fragment;

  return (
    <>
      <ActionRoot>
        <NavTreeItemAction
          variant='plank-heading'
          label={t('node actions menu invoker label')}
          actions={activeNode.actions.flatMap((action) => ('invoke' in action ? [action] : []))}
          onAction={(action) => action.invoke?.({ caller: TREE_ITEM_MAIN_HEADING })}
          icon={activeNode.icon ?? DotsThreeVertical}
          caller={TREE_ITEM_MAIN_HEADING}
        />
      </ActionRoot>
      <h1 className='mli-1 min-is-0 shrink-1 truncate font-medium fg-accent'>
        {toLocalizedString(activeNode.label, t)}
      </h1>
    </>
  );
};
