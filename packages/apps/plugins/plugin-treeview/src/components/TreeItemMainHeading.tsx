//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Node } from '@dxos/app-graph';
import { useIntent } from '@dxos/react-surface';
import { Breadcrumb, Button, useTranslation } from '@dxos/react-ui';

import { TREE_VIEW_PLUGIN } from '../types';
import { getTreeItemLabel } from '../util';

export const TreeItemMainHeading = ({ activeNode }: { activeNode: Node }) => {
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const { dispatch } = useIntent();

  const handleActivate = (node: Node) => {
    void dispatch({
      // TODO(wittjosiah): What's a good pattern for more generic actions?
      action: 'dxos.org/plugin/splitview/action/activate',
      data: { id: node.id },
    });
  };

  return (
    <Breadcrumb.Root aria-label={t('breadcrumb label')} classNames='shrink min-is-0'>
      <Breadcrumb.List>
        {activeNode.parent && activeNode.parent.id !== 'root' && (
          <>
            <Breadcrumb.ListItem>
              <Breadcrumb.Link asChild onClick={() => activeNode.parent && handleActivate(activeNode.parent)}>
                <Button variant='ghost' classNames='shrink text-sm pli-0 gap-1 overflow-hidden'>
                  {activeNode.parent.icon && <activeNode.parent.icon className='shrink-0' />}
                  <span className='min-is-0  flex-1 truncate'>{getTreeItemLabel(activeNode.parent, t)}</span>
                </Button>
              </Breadcrumb.Link>
            </Breadcrumb.ListItem>
            <Breadcrumb.Separator />
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
  );
};
