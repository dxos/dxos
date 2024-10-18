//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { type HuePalette, hueTokens, mx, valenceColorText } from '@dxos/react-ui-theme';

import { navTreeHeading, topLevelText, treeItemText } from './navtree-fragments';

export type NavTreeItemHeadingProps = {
  id: string;
  level: number;
  label: string;
  icon?: string;
  current?: boolean;
  disabled?: boolean;
  error?: boolean;
  modified?: boolean;
  palette?: string;
  onNavigate: () => void;
};

export const NavTreeItemHeading = forwardRef<HTMLButtonElement, NavTreeItemHeadingProps>(
  ({ id, level, label, icon, current, disabled, error, modified, palette, onNavigate }, forwardedRef) => {
    return (
      <Button
        {...(level > 1 && { 'data-testid': 'navtree.treeItem.link' })}
        data-itemid={id}
        data-testid='navtree.treeItem.heading'
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            onNavigate();
          }
        }}
        onClick={onNavigate}
        density='fine'
        variant='ghost'
        classNames={[
          'grow gap-1 !pis-0.5 hover:!bg-transparent dark:hover:!bg-transparent',
          level < 1 && topLevelText,
          level < 1 && palette && hueTokens[palette as HuePalette].text,
          level < 1 && palette && hueTokens[palette as HuePalette].textHover,
          error && valenceColorText('error'),
        ]}
        disabled={disabled}
        {...(current && { 'aria-current': 'location' })}
        ref={forwardedRef}
      >
        {icon && <Icon icon={icon} size={4} />}
        <span
          data-tooltip='content'
          id={`${id}__label`}
          className={mx(navTreeHeading, modified && 'italic', level < 1 ? topLevelText : treeItemText)}
        >
          {label}
        </span>
      </Button>
    );
  },
);
