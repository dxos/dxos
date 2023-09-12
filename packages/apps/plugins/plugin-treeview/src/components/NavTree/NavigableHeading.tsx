//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { TreeItem, useMediaQuery, useSidebars, useTranslation } from '@dxos/aurora';
import { auroraTx, descriptionText, getSize, mx, valenceColorText } from '@dxos/aurora-theme';

import {
  topLevelHeadingHoverColor,
  navTreeHeading,
  topLevelHeadingColor,
  topLevelText,
  treeItemText,
} from './navtree-fragments';
import { SharedTreeItemHeadingProps } from './props';
import { TREE_VIEW_PLUGIN, TreeViewAction } from '../../types';
import { getTreeItemLabel } from '../../util';

export const NavigableHeading = forwardRef<HTMLButtonElement, SharedTreeItemHeadingProps>(
  ({ node, level, active }, forwardedRef) => {
    const [isLg] = useMediaQuery('lg', { ssr: false });
    const { navigationSidebarOpen, closeNavigationSidebar } = useSidebars();
    const { t } = useTranslation(TREE_VIEW_PLUGIN);
    const { sendIntent } = useIntent();

    const disabled = !!node.properties?.disabled;
    const error = !!node.properties?.error;
    const modified = node.properties?.modified ?? false;

    return (
      <TreeItem.Heading asChild>
        <button
          role='link'
          {...(level > 1 && { 'data-testid': 'spacePlugin.documentTreeItemLink' })}
          data-itemid={node.id}
          {...(!navigationSidebarOpen && { tabIndex: -1 })}
          onKeyDown={async (event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.stopPropagation();

              await sendIntent({
                plugin: TREE_VIEW_PLUGIN,
                action: TreeViewAction.ACTIVATE,
                data: {
                  id: node.id,
                },
              });
              !isLg && closeNavigationSidebar();
            }
          }}
          onClick={async (event) => {
            await sendIntent({
              plugin: TREE_VIEW_PLUGIN,
              action: TreeViewAction.ACTIVATE,
              data: {
                id: node.id,
              },
            });
            !isLg && closeNavigationSidebar();
          }}
          className={auroraTx(
            'button.root',
            'tree-item__heading--link',
            { variant: 'ghost', density: 'fine', disabled },
            'gap-1 justify-start pli-0',
            navTreeHeading,
            level < 1 && topLevelHeadingColor(node.properties?.palette),
            level < 1 && topLevelHeadingHoverColor(node.properties?.palette),
            error && valenceColorText('error'),
          )}
          {...(disabled && { disabled, 'aria-disabled': true })}
          {...(active && { 'aria-current': 'page' })}
          ref={forwardedRef}
        >
          {node.icon && <node.icon className={mx(descriptionText, 'shrink-0', getSize(4))} />}
          <span className={mx(navTreeHeading, modified && 'italic', level < 1 ? topLevelText : treeItemText)}>
            {getTreeItemLabel(node, t)}
          </span>
        </button>
      </TreeItem.Heading>
    );
  },
);
