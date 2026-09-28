//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes } from 'react';

import { type MessageValence } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { useToolbarItem } from '../Toolbar/index.ts';

/** The current Button's variants; `primary` marks the one action a surface leads with (e.g. a form's Save). */
export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'outline' | 'destructive' | 'valence';

export type ButtonValence = MessageValence;

export type ButtonVariantProps = {
  variant?: ButtonVariant;
  /** Colour of the `valence` variant; without it the button adopts an enclosing valence surface's, else neutral. */
  valence?: ButtonValence;
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps;

// `button` by default: the browser's `submit` would post an enclosing form on every click.
export const Button = composable<HTMLButtonElement, ButtonProps>(
  ({ children, type = 'button', variant = 'default', valence, onFocus, ...props }, forwardedRef) => {
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
        data-valence={variant === 'valence' ? valence : undefined}
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
