//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight, type IconProps } from '@phosphor-icons/react';
import React, { type FC, forwardRef } from 'react';

import { Button, TreeItem, useSidebars } from '@dxos/aurora';
import { getSize, ghostButtonColors, mx, staticDisabled, valenceColorText } from '@dxos/aurora-theme';

import {
  navTreeHeading,
  topLevelHeadingColor,
  topLevelHeadingHoverColor,
  topLevelText,
  treeItemText,
} from './navtree-fragments';

export type NavTreeItemHeadingProps = {
  id: string;
  level: number;
  label: string;
  icon?: FC<IconProps>;
  open?: boolean;
  current?: boolean;
  branch?: boolean;
  disabled?: boolean;
  error?: boolean;
  modified?: boolean;
  // TODO(burdon): Theme.
  palette?: string;
};

export const NavTreeItemHeading = forwardRef<HTMLButtonElement, NavTreeItemHeadingProps>(
  ({ id, level, label, icon: Icon, open, current, branch, disabled, error, modified, palette }, forwardedRef) => {
    // const [isLg] = useMediaQuery('lg', { ssr: false });
    // TODO(wittjosiah): Decouple from sidebars.
    const { navigationSidebarOpen /*, closeNavigationSidebar */ } = useSidebars();

    const OpenTriggerIcon = open ? CaretDown : CaretRight;
    // const defaultAction = node.actions.find((action) => action.properties.disposition === 'default');

    return (
      <div
        role='none'
        className={mx(
          'grow flex items-center gap-1 pli-0',
          level < 1 && topLevelText,
          level < 1 && topLevelHeadingColor(palette),
          level < 1 && topLevelHeadingHoverColor(palette),
          error && valenceColorText('error'),
        )}
      >
        {branch && (
          <TreeItem.OpenTrigger
            {...(disabled && { disabled, 'aria-disabled': true })}
            {...(!navigationSidebarOpen && { tabIndex: -1 })}
            classNames={['-translate-x-2', ghostButtonColors, disabled && staticDisabled]}
            // TODO(wittjosiah): Why space plugin? This is treeview.
            data-testid={!open ? 'navTree.treeItem.openTrigger' : 'navTree.treeItem.closeTrigger'}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.stopPropagation();
              }
            }}
          >
            <OpenTriggerIcon className={mx('shrink-0 text-[--icons-color]', getSize(3))} />
          </TreeItem.OpenTrigger>
        )}
        <TreeItem.Heading data-testid='navTree.treeItem.heading' asChild>
          <Button
            role='link'
            {...(level > 1 && { 'data-testid': 'navTree.treeItem.link' })}
            data-itemid={id}
            {...(!navigationSidebarOpen && { tabIndex: -1 })}
            onKeyDown={async (event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.stopPropagation();
                // void handleSelect();
              }
            }}
            // onClick={handleSelect}
            density='fine'
            variant='ghost'
            classNames={['grow gap-1', branch && '-mis-6']}
            disabled={disabled}
            {...(current && { 'aria-current': 'page' })}
            ref={forwardedRef}
          >
            {Icon && <Icon className={mx('shrink-0 text-[--icons-color]', getSize(4))} />}
            <span className={mx(navTreeHeading, modified && 'italic', level < 1 ? topLevelText : treeItemText)}>
              {/* {Array.isArray(node.label) ? t(...node.label) : node.label} */}
              {label}
            </span>
          </Button>
        </TreeItem.Heading>
      </div>
    );
  },
);
