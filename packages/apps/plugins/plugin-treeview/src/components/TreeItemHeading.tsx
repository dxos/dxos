//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { Breadcrumb, useTranslation } from '@dxos/aurora';

import { TREE_VIEW_PLUGIN } from '../types';

export const TreeItemHeading = ({ data: node }: { data: Graph.Node }) => {
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  return (
    <Breadcrumb.Root aria-label={t('breadcrumb label')}>
      <Breadcrumb.List>
        <Breadcrumb.ListItem>
          <Breadcrumb.Current>{Array.isArray(node.label) ? t(...node.label) : node.label}</Breadcrumb.Current>
        </Breadcrumb.ListItem>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};
