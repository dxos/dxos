//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Button } from '@dxos/react-ui';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
import { getSize, type HuePalette, hueTokens, mx, valenceColorText } from '@dxos/react-ui-theme';

import { navTreeHeading, topLevelText, treeItemText } from './navtree-fragments';

export type NavTreeItemHeadingProps = {
  id: string;
  level: number;
  label: string;
  iconSymbol?: string;
  current?: boolean;
  disabled?: boolean;
  error?: boolean;
  modified?: boolean;
  // TODO(burdon): Change to semantic classes that are customizable.
  palette?: string;
  onNavigate: () => void;
};

export const NavTreeItemHeading = forwardRef<HTMLButtonElement, NavTreeItemHeadingProps>(
  ({ id, level, label, iconSymbol, current, disabled, error, modified, palette, onNavigate }, forwardedRef) => {
    return (
      <TextTooltip
        text={label}
        side='bottom'
        truncateQuery='span[data-tooltip]'
        onlyWhenTruncating
        asChild
        ref={forwardedRef}
      >
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
        >
          {iconSymbol && (
            <svg className={mx('shrink-0 text-[--icons-color]', getSize(4))}>
              <use href={`/icons.svg#${iconSymbol}`} />
            </svg>
          )}

          <span
            data-tooltip='content'
            id={`${id}__label`}
            className={mx(navTreeHeading, modified && 'italic', level < 1 ? topLevelText : treeItemText)}
          >
            {label}
          </span>
        </Button>
      </TextTooltip>
    );
  },
);
