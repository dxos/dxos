//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { TreeItem, useMediaQuery, useSidebars, useTranslation } from '@dxos/aurora';
import { auroraTx, getSize, mx, staticDisabled, valenceColorText } from '@dxos/aurora-theme';

import { useTreeView } from '../../TreeViewContext';
import { TREE_VIEW_PLUGIN } from '../../types';
import { navTreeHeading, topLevelHeadingColor, topLevelText, treeItemText } from './style-fragments';

export const NavigableHeading = ({ node, level }: { node: Graph.Node; level: number }) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { navigationSidebarOpen, closeNavigationSidebar } = useSidebars();
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const treeView = useTreeView();

  const disabled = !!node.properties?.disabled;
  const error = !!node.properties?.error;
  const modified = node.properties?.modified ?? false;

  return (
    <TreeItem.Heading asChild>
      <button
        role='link'
        data-testid='spacePlugin.documentTreeItemHeading'
        data-itemid={node.id}
        {...(!navigationSidebarOpen && { tabIndex: -1 })}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.stopPropagation();
            // TODO(wittjosiah): Intent.
            treeView.active = node.id;
            !isLg && closeNavigationSidebar();
          }
        }}
        onClick={(event) => {
          // TODO(wittjosiah): Intent.
          treeView.active = node.id;
          !isLg && closeNavigationSidebar();
        }}
        className={auroraTx(
          'button.root',
          'tree-item__heading--link',
          { variant: 'ghost', density: 'fine' },
          'gap-1 justify-start',
          navTreeHeading,
          level < 1 ? 'pli-1.5' : 'pli-0',
          disabled && staticDisabled,
          error && valenceColorText('error'),
        )}
        {...(disabled && { disabled, 'aria-disabled': true })}
      >
        {node.icon && <node.icon className={mx(getSize(4), 'shrink-0')} />}
        <span
          className={mx(
            navTreeHeading,
            modified && 'italic',
            level < 1 && topLevelHeadingColor(node.properties?.palette),
            level < 1 ? topLevelText : treeItemText,
          )}
        >
          {Array.isArray(node.label) ? t(...node.label) : node.label}
        </span>
      </button>
    </TreeItem.Heading>
  );
};
