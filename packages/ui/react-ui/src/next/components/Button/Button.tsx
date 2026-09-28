//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { useToolbarItem } from '../Toolbar/index.ts';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `primary` marks the one action a surface leads with (e.g. a form's Save). */
  variant?: 'default' | 'primary';
};

// `button` by default: the browser's `submit` would post an enclosing form on every click.
export const Button = composable<HTMLButtonElement, ButtonProps>(
  ({ children, type = 'button', variant = 'default', onFocus, ...props }, forwardedRef) => {
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
        data-variant={variant}
        data-scope='button'
        data-part='root'
        className={className}
        ref={forwardedRef}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Next.Button';
