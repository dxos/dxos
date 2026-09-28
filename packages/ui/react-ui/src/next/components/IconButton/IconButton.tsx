//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';
import { useToolbarItem } from '../Toolbar/index.ts';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  icon: string;
  /** Required: an icon-only button has no other accessible name. */
  label: string;
};

export const IconButton = composable<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, type = 'button', onFocus, ...props }, forwardedRef) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const { className, ...rest } = composableProps(props, { classNames: recipes.button() });
    return (
      <button
        {...rest}
        {...toolbarItem}
        onFocus={(event) => {
          onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        type={type}
        aria-label={label}
        title={label}
        data-scope='icon-button'
        data-part='root'
        data-square=''
        className={className}
        ref={forwardedRef}
      >
        <Icon icon={icon} />
      </button>
    );
  },
);

IconButton.displayName = 'Next.IconButton';
