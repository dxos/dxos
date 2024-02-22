//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { Fragment } from 'react';

import { KEY_BINDING, useGraph } from '@braneframe/plugin-graph';
import { type Node } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';
import { Popover, useTranslation } from '@dxos/react-ui';
import { NavTreeItemAction } from '@dxos/react-ui-navtree';

import { NAVTREE_PLUGIN } from '../meta';
import { getTreeItemLabel } from '../util';

const TREE_ITEM_MAIN_HEADING = 'TreeItemMainHeading';

export const NavBarStart = ({ activeNode, popoverAnchorId }: { activeNode: Node; popoverAnchorId?: string }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const { graph } = useGraph();
  const context = graph.getPath(activeNode.id)?.join('/');
  Keyboard.singleton.setCurrentContext(context);

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
          actions={activeNode.actions}
          onAction={(action) => action.invoke?.({ caller: TREE_ITEM_MAIN_HEADING })}
          icon={activeNode.icon ?? DotsThreeVertical}
          caller={TREE_ITEM_MAIN_HEADING}
        />
      </ActionRoot>
      <h1 className='mli-1 min-is-0 shrink-1 truncate font-medium fg-accent'>{getTreeItemLabel(activeNode, t)}</h1>
    </>
  );
};
