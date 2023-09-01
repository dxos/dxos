//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';

import { TreeItem, useSidebars, useTranslation } from '@dxos/aurora';
import { descriptionText, getSize, ghostButtonColors, mx, staticDisabled, valenceColorText } from '@dxos/aurora-theme';

import { TREE_VIEW_PLUGIN } from '../../types';
import { getTreeItemLabel } from '../../util';
import {
  collapsibleSpacing,
  navTreeHeading,
  topLevelCollapsibleSpacing,
  topLevelHeadingColor,
  topLevelText,
  treeItemText,
} from './navtree-fragments';
import { SharedTreeItemHeadingProps } from './props';

export const CollapsibleHeading = forwardRef<HTMLDivElement, SharedTreeItemHeadingProps>(
  ({ open, node, level, active }, forwardedRef) => {
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
        {...(active && { 'aria-current': 'page' })}
        ref={forwardedRef}
      >
        {getTreeItemLabel(node, t)}
      </TreeItem.Heading>
    ) : (
      <TreeItem.OpenTrigger
        {...(disabled && { disabled, 'aria-disabled': true })}
        {...(!navigationSidebarOpen && { tabIndex: -1 })}
        classNames={['flex items-center gap-1 pie-1', navTreeHeading, ghostButtonColors, disabled && staticDisabled]}
        // TODO(wittjosiah): Why space plugin? This is treeview.
        data-testid={!open ? 'spacePlugin.spaceTreeItemOpenTrigger' : 'spacePlugin.spaceTreeItemCloseTrigger'}
      >
        <OpenTriggerIcon weight='fill' className={mx('shrink-0', descriptionText, getSize(2))} />
        {node.icon && <node.icon className={mx(descriptionText, 'shrink-0', getSize(4))} />}
        <TreeItem.Heading
          data-testid='spacePlugin.spaceTreeItemHeading'
          classNames={[navTreeHeading, collapsibleSpacing, treeItemText, error && valenceColorText('error')]}
          {...(active && { 'aria-current': 'page' })}
        >
          {getTreeItemLabel(node, t)}
        </TreeItem.Heading>
      </TreeItem.OpenTrigger>
    );
  },
);
