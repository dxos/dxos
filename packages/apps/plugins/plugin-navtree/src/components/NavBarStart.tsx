//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { Fragment } from 'react';

import { type Node } from '@dxos/app-graph';
import { Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { PlankHeading } from '@dxos/react-ui-deck';

import { KEY_BINDING, NAVTREE_PLUGIN } from '../meta';

const TREE_ITEM_MAIN_HEADING = 'TreeItemMainHeading';

export const NavBarStart = ({ activeNode, popoverAnchorId }: { activeNode: Node; popoverAnchorId?: string }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const ActionRoot =
    popoverAnchorId === `dxos.org/ui/${TREE_ITEM_MAIN_HEADING}/${activeNode.id}` ||
    popoverAnchorId === `dxos.org/ui/${KEY_BINDING}/${activeNode.id}`
      ? Popover.Anchor
      : Fragment;

  const Icon = activeNode.properties?.icon ?? DotsThreeVertical;
  const actions = activeNode.actions();
  const label = toLocalizedString(activeNode.properties?.label, t);

  const menuTriggerLabel = t('node actions menu invoker label');

  return (
    <>
      <ActionRoot>
        <PlankHeading.ActionsMenu
          Icon={Icon}
          attendableId={activeNode.id}
          triggerLabel={menuTriggerLabel}
          actions={actions}
          onAction={(action) =>
            typeof action.data === 'function' && action.data({ node: action as Node, caller: TREE_ITEM_MAIN_HEADING })
          }
        />
      </ActionRoot>
      <PlankHeading.Label attendableId={activeNode.id}>{label}</PlankHeading.Label>
    </>
  );
};
