//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { Fragment } from 'react';

import { Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { PlankHeading, plankHeadingIconProps } from '@dxos/react-ui-deck';
import { type TreeNode } from '@dxos/react-ui-navtree';

import { KEY_BINDING, NAVTREE_PLUGIN } from '../meta';

const TREE_ITEM_MAIN_HEADING = 'TreeItemMainHeading';

export const NavBarStart = ({ activeNode, popoverAnchorId }: { activeNode: TreeNode; popoverAnchorId?: string }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const ActionRoot =
    popoverAnchorId === `dxos.org/ui/${TREE_ITEM_MAIN_HEADING}/${activeNode.id}` ||
    popoverAnchorId === `dxos.org/ui/${KEY_BINDING}/${activeNode.id}`
      ? Popover.Anchor
      : Fragment;

  const Icon = activeNode.icon ?? DotsThreeVertical;

  const menuTriggerLabel = t('node actions menu invoker label');

  return (
    <>
      <ActionRoot>
        <PlankHeading.ActionsMenu
          triggerLabel={menuTriggerLabel}
          actions={activeNode.actions.flatMap((action) => ('invoke' in action ? [action] : []))}
          onAction={(action) => action.invoke?.({ caller: TREE_ITEM_MAIN_HEADING })}
        >
          <PlankHeading.Button attendableId={activeNode.id}>
            <Icon {...plankHeadingIconProps} />
            <span className='sr-only'>{menuTriggerLabel}</span>
          </PlankHeading.Button>
        </PlankHeading.ActionsMenu>
      </ActionRoot>
      <PlankHeading.Label attendableId={activeNode.id}>{toLocalizedString(activeNode.label, t)}</PlankHeading.Label>
    </>
  );
};
