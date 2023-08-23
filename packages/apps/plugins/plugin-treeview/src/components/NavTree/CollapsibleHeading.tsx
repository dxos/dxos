//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from '@phosphor-icons/react';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { TreeItem, useSidebars, useTranslation } from '@dxos/aurora';
import { getSize, ghostButtonColors, mx, staticDisabled, valenceColorText } from '@dxos/aurora-theme';

import { TREE_VIEW_PLUGIN } from '../../types';
import {
  collapsibleSpacing,
  navTreeHeading,
  topLevelCollapsibleSpacing,
  topLevelHeadingColor,
  topLevelText,
  treeItemText,
} from './navtree-fragments';

export const CollapsibleHeading = ({ open, node, level }: { open: boolean; level: number; node: Graph.Node }) => {
  const { navigationSidebarOpen } = useSidebars();
  const { t } = useTranslation(TREE_VIEW_PLUGIN);

  const disabled = !!node.properties?.disabled;
  const error = !!node.properties?.error;
  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  return level < 1 ? (
    <TreeItem.Heading
      data-testid='spacePlugin.spaceTreeItemHeading'
      classNames={[
        navTreeHeading,
        topLevelCollapsibleSpacing,
        topLevelText,
        'pli-1',
        topLevelHeadingColor(node.properties?.palette),
      ]}
    >
      {Array.isArray(node.label) ? t(...node.label) : node.label}
    </TreeItem.Heading>
  ) : (
    <TreeItem.OpenTrigger
      {...(disabled && { disabled, 'aria-disabled': true })}
      {...(!navigationSidebarOpen && { tabIndex: -1 })}
      classNames={['grow flex items-center gap-1 pie-1', ghostButtonColors, disabled && staticDisabled]}
    >
      <OpenTriggerIcon weight='fill' className={mx('shrink-0', getSize(2))} />
      {node.icon && <node.icon className={getSize(4)} />}
      <TreeItem.Heading
        data-testid='spacePlugin.spaceTreeItemHeading'
        classNames={[navTreeHeading, collapsibleSpacing, treeItemText, error && valenceColorText('error')]}
      >
        {Array.isArray(node.label) ? t(...node.label) : node.label}
      </TreeItem.Heading>
    </TreeItem.OpenTrigger>
  );
};
