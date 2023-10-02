//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from '@phosphor-icons/react';
import React, { forwardRef } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { Button, TreeItem, useMediaQuery, useSidebars, useTranslation } from '@dxos/aurora';
import { getSize, ghostButtonColors, mx, staticDisabled, valenceColorText } from '@dxos/aurora-theme';

import {
  navTreeHeading,
  topLevelHeadingColor,
  topLevelHeadingHoverColor,
  topLevelText,
  treeItemText,
} from './navtree-fragments';
import { SharedTreeItemHeadingProps } from './props';
import { TREE_VIEW_PLUGIN } from '../../types';
import { getTreeItemLabel } from '../../util';

export const NavTreeItemHeading = forwardRef<HTMLButtonElement, SharedTreeItemHeadingProps>(
  ({ open, node, level, active }, forwardedRef) => {
    const [isLg] = useMediaQuery('lg', { ssr: false });
    const { navigationSidebarOpen, closeNavigationSidebar } = useSidebars();
    const { t } = useTranslation(TREE_VIEW_PLUGIN);
    const { dispatch } = useIntent();

    const isBranch = node.properties?.role === 'branch' || node.children.length > 0;
    const disabled = !!node.properties?.disabled;
    const error = !!node.properties?.error;
    const modified = node.properties?.modified ?? false;
    const OpenTriggerIcon = open ? CaretDown : CaretRight;
    const defaultAction = node.actions.find((action) => action.properties.disposition === 'default');

    const handleSelect = async () => {
      await dispatch({
        action: 'dxos.org/plugin/splitview/action/activate',
        data: {
          id: node.id,
        },
      });
      void defaultAction?.invoke();
      !isLg && closeNavigationSidebar();
    };

    return (
      <div
        role='none'
        className={mx(
          'grow flex items-center gap-1 pli-0',
          level < 1 && topLevelText,
          // TODO(burdon): Theme.
          level < 1 && topLevelHeadingColor(node.properties?.palette),
          level < 1 && topLevelHeadingHoverColor(node.properties?.palette),
          error && valenceColorText('error'),
        )}
      >
        {isBranch && (
          <TreeItem.OpenTrigger
            {...(disabled && { disabled, 'aria-disabled': true })}
            {...(!navigationSidebarOpen && { tabIndex: -1 })}
            classNames={['-translate-x-2', ghostButtonColors, disabled && staticDisabled]}
            // TODO(wittjosiah): Why space plugin? This is treeview.
            data-testid={!open ? 'spacePlugin.spaceTreeItemOpenTrigger' : 'spacePlugin.spaceTreeItemCloseTrigger'}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.stopPropagation();
              }
            }}
          >
            <OpenTriggerIcon className={mx('shrink-0 text-[--icons-color]', getSize(3))} />
          </TreeItem.OpenTrigger>
        )}
        <TreeItem.Heading data-testid='spacePlugin.spaceTreeItemHeading' asChild>
          <Button
            role='link'
            {...(level > 1 && { 'data-testid': 'spacePlugin.documentTreeItemLink' })}
            data-itemid={node.id}
            {...(!navigationSidebarOpen && { tabIndex: -1 })}
            onKeyDown={async (event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.stopPropagation();
                void handleSelect();
              }
            }}
            onClick={handleSelect}
            density='fine'
            variant='ghost'
            classNames={['grow gap-1', isBranch && '-mis-6']}
            disabled={disabled}
            {...(active && { 'aria-current': 'page' })}
            ref={forwardedRef}
          >
            {node.icon && <node.icon className={mx('shrink-0 text-[--icons-color]', getSize(4))} />}
            <span className={mx(navTreeHeading, modified && 'italic', level < 1 ? topLevelText : treeItemText)}>
              {getTreeItemLabel(node, t)}
            </span>
          </Button>
        </TreeItem.Heading>
      </div>
    );
  },
);
