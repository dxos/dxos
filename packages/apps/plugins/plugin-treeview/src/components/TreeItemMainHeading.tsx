//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Node } from '@braneframe/plugin-graph';
import { useIntent } from '@braneframe/plugin-intent';
import { Breadcrumb, Button, useTranslation } from '@dxos/aurora';

import { TREE_VIEW_PLUGIN } from '../types';
import { getTreeItemLabel } from '../util';

export const TreeItemMainHeading = ({ data: node }: { data: Node }) => {
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
        {node.parent && node.parent.id !== 'root' && (
          <>
            <Breadcrumb.ListItem>
              <Breadcrumb.Link asChild onClick={() => node.parent && handleActivate(node.parent)}>
                <Button variant='ghost' classNames='shrink text-sm pli-0 gap-1 overflow-hidden'>
                  {node.parent.icon && <node.parent.icon className='shrink-0' />}
                  <span className='min-is-0  flex-1 truncate'>{getTreeItemLabel(node.parent, t)}</span>
                </Button>
              </Breadcrumb.Link>
            </Breadcrumb.ListItem>
            <Breadcrumb.Separator />
          </>
        )}
        <Breadcrumb.ListItem>
          <Breadcrumb.Current classNames='shrink text-sm font-medium flex items-center gap-1 overflow-hidden'>
            {node.icon && <node.icon className='shrink-0' />}
            <span className='min-is-0 flex-1 truncate'>{getTreeItemLabel(node, t)}</span>
          </Breadcrumb.Current>
        </Breadcrumb.ListItem>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};
