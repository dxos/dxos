//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { Fragment } from 'react';

import { KEY_BINDING, useGraph } from '@braneframe/plugin-graph';
import { useIntent } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';
import { Breadcrumb, Button, Popover, useTranslation } from '@dxos/react-ui';
import { NavTreeItemAction } from '@dxos/react-ui-navtree';

import { NAVTREE_PLUGIN } from '../meta';
import { getTreeItemLabel } from '../util';

const TREE_ITEM_MAIN_HEADING = 'TreeItemMainHeading';

export const NavBarStart = ({ activeNode, popoverAnchorId }: { activeNode: Node; popoverAnchorId?: string }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { dispatch } = useIntent();

  const { graph } = useGraph();
  const context = graph.getPath(activeNode.id)?.join('/');
  Keyboard.singleton.setCurrentContext(context);

  const handleActivate = (node: Node) => {
    void dispatch({
      // TODO(wittjosiah): What's a good pattern for more generic actions?
      action: 'dxos.org/plugin/layout/action/activate',
      data: { id: node.id },
    });
  };

  const ActionRoot =
    popoverAnchorId === `dxos.org/ui/${TREE_ITEM_MAIN_HEADING}/${activeNode.id}` ||
    popoverAnchorId === `dxos.org/ui/${KEY_BINDING}/${activeNode.id}`
      ? Popover.Anchor
      : Fragment;

  return (
    <>
      <Breadcrumb.Root aria-label={t('breadcrumb label')} classNames='shrink min-is-0'>
        <Breadcrumb.List>
          {activeNode.parent && activeNode.parent.id !== 'root' && (
            <>
              <Breadcrumb.ListItem>
                <Breadcrumb.Link asChild onClick={() => activeNode.parent && handleActivate(activeNode.parent)}>
                  <Button variant='ghost' classNames='hidden sm:flex shrink text-sm pli-1 -mli-1 gap-1 overflow-hidden'>
                    {activeNode.parent.icon && <activeNode.parent.icon className='shrink-0' />}
                    <span className='min-is-0  flex-1 truncate'>{getTreeItemLabel(activeNode.parent, t)}</span>
                  </Button>
                </Breadcrumb.Link>
              </Breadcrumb.ListItem>
              <Breadcrumb.Separator classNames='hidden sm:flex' />
            </>
          )}
          <Breadcrumb.ListItem>
            <Breadcrumb.Current classNames='shrink text-sm font-medium flex items-center gap-1 overflow-hidden'>
              {activeNode.icon && <activeNode.icon className='shrink-0' />}
              <span className='min-is-0 flex-1 truncate'>{getTreeItemLabel(activeNode, t)}</span>
            </Breadcrumb.Current>
          </Breadcrumb.ListItem>
        </Breadcrumb.List>
      </Breadcrumb.Root>
      <ActionRoot>
        <NavTreeItemAction
          label={t('node actions menu invoker label')}
          actions={activeNode.actions}
          onAction={(action) => action.invoke?.({ caller: TREE_ITEM_MAIN_HEADING })}
          icon={DotsThreeVertical}
          caller={TREE_ITEM_MAIN_HEADING}
        />
      </ActionRoot>
    </>
  );
};
