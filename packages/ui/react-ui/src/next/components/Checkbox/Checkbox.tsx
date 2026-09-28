//
// Copyright 2026 DXOS.org
//

import { Checkbox as CheckboxPrimitive } from '@ark-ui/react/checkbox';
import React, { type ReactNode, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';

export type CheckboxProps = ThemedClassName<Omit<CheckboxPrimitive.RootProps, 'children'>> & {
  /** Visible label beside the box; without one pass `aria-label`. */
  'label'?: ReactNode;
  'aria-label'?: string;
};

/** Ark checkbox with its box at control size; the root is a block-tall row so it lines up with other controls. */
export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(
  ({ classNames, label, 'aria-label': ariaLabel, ...props }, forwardedRef) => (
    <CheckboxPrimitive.Root {...props} className={mx(recipes.checkbox(), classNames)} ref={forwardedRef}>
      <CheckboxPrimitive.Control className={recipes.checkboxControl()}>
        <CheckboxPrimitive.Indicator>
          <Icon icon='ph--check--bold' />
        </CheckboxPrimitive.Indicator>
        <CheckboxPrimitive.Indicator indeterminate>
          <Icon icon='ph--minus--bold' />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      {label && <CheckboxPrimitive.Label>{label}</CheckboxPrimitive.Label>}
      <CheckboxPrimitive.HiddenInput aria-label={ariaLabel} />
    </CheckboxPrimitive.Root>
  ),
);

Checkbox.displayName = 'Next.Checkbox';
