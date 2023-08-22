//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { Breadcrumb, Button, useTranslation } from '@dxos/aurora';

import { TREE_VIEW_PLUGIN } from '../types';

export const TreeItemHeading = ({ data: node }: { data: Graph.Node }) => {
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  return (
    <Breadcrumb.Root aria-label={t('breadcrumb label')}>
      <Breadcrumb.List>
        {node.parent && (
          <>
            <Breadcrumb.ListItem>
              <Breadcrumb.Link asChild>
                <Button variant='ghost' classNames='text-sm pli-0 gap-1'>
                  {node.parent.icon && <node.parent.icon />}
                  <span>{Array.isArray(node.parent.label) ? t(...node.parent.label) : node.parent.label}</span>
                </Button>
              </Breadcrumb.Link>
            </Breadcrumb.ListItem>
            <Breadcrumb.Separator />
          </>
        )}
        <Breadcrumb.ListItem>
          <Breadcrumb.Current classNames='text-sm font-medium flex items-center gap-1'>
            {node.icon && <node.icon />}
            <span>{Array.isArray(node.label) ? t(...node.label) : node.label}</span>
          </Breadcrumb.Current>
        </Breadcrumb.ListItem>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};
