//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight, type IconProps } from '@phosphor-icons/react';
import React, { type FC, forwardRef } from 'react';

import { Button, TreeItem } from '@dxos/react-ui';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
import { getSize, type HuePalette, hueTokens, mx, valenceColorText } from '@dxos/react-ui-theme';

import { navTreeHeading, topLevelText, treeItemText } from './navtree-fragments';

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
  // TODO(burdon): Change to semantic classes that are customizable.
  palette?: string;
  onSelect: () => void;
};

export const NavTreeItemHeading = forwardRef<HTMLButtonElement, NavTreeItemHeadingProps>(
  (
    { id, level, label, icon: Icon, open, current, branch, disabled, error, modified, palette, onSelect },
    forwardedRef,
  ) => {
    const OpenTriggerIcon = open ? CaretDown : CaretRight;

    return (
      <div
        role='none'
        className={mx(
          'grow flex items-center gap-1 pli-0',
          level < 1 && topLevelText,
          level < 1 && palette && hueTokens[palette as HuePalette].text,
          level < 1 && palette && hueTokens[palette as HuePalette].textHover,
          error && valenceColorText('error'),
        )}
      >
        {branch && (
          <TreeItem.OpenTrigger
            classNames='-translate-x-3 pli-1.5'
            disabled={disabled}
            data-testid={!open ? 'navtree.treeItem.openTrigger' : 'navtree.treeItem.closeTrigger'}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.stopPropagation();
              }
            }}
          >
            <OpenTriggerIcon className={mx('shrink-0 text-[--icons-color]', getSize(3))} />
          </TreeItem.OpenTrigger>
        )}
        <TreeItem.Heading data-testid='navtree.treeItem.heading' asChild>
          <Button
            role='link'
            {...(level > 1 && { 'data-testid': 'navtree.treeItem.link' })}
            data-itemid={id}
            onKeyDown={async (event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.stopPropagation();
                onSelect();
              }
            }}
            onClick={onSelect}
            density='fine'
            variant='ghost'
            classNames={['grow gap-1 hover:!bg-transparent dark:hover:!bg-transparent', branch && '-mis-6']}
            disabled={disabled}
            {...(current && { 'aria-current': 'page' })}
            ref={forwardedRef}
          >
            {Icon && <Icon className={mx('shrink-0 text-[--icons-color]', getSize(4))} />}
            <TextTooltip onlyWhenTruncating text={label} side='bottom' sideOffset={8}>
              <span className={mx(navTreeHeading, modified && 'italic', level < 1 ? topLevelText : treeItemText)}>
                {label}
              </span>
            </TextTooltip>
          </Button>
        </TreeItem.Heading>
      </div>
    );
  },
);
