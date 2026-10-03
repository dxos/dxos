//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Checkbox as CheckboxPrimitive } from '@ark-ui/react/checkbox';
import React, { type ReactNode, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import * as Fieldset from '../Fieldset/Fieldset.tsx';
import * as Icon from '../Icon/Icon.tsx';

export type CheckboxProps = ThemedClassName<Omit<CheckboxPrimitive.RootProps, 'children'>> & {
  /** Visible label beside the box; without one pass `aria-label`. */
  'label'?: ReactNode;
  'aria-label'?: string;
};

/** Ark checkbox with its box at control size; the root is a block-tall row so it lines up with other controls. */
export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(
  ({ classNames, label, 'aria-label': ariaLabel, disabled, ...props }, forwardedRef) => (
    <CheckboxPrimitive.Root
      {...props}
      disabled={Fieldset.useFieldsetDisabled(disabled)}
      className={mx(recipes.checkbox(), classNames)}
      ref={forwardedRef}
    >
      <CheckboxPrimitive.Control className={recipes.checkboxControl()}>
        <CheckboxPrimitive.Indicator>
          <Icon.Icon icon='ph--check--bold' />
        </CheckboxPrimitive.Indicator>
        <CheckboxPrimitive.Indicator indeterminate>
          <Icon.Icon icon='ph--minus--bold' />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      {label && <CheckboxPrimitive.Label>{label}</CheckboxPrimitive.Label>}
      <CheckboxPrimitive.HiddenInput aria-label={ariaLabel} />
    </CheckboxPrimitive.Root>
  ),
);

Checkbox.displayName = 'Checkbox';
