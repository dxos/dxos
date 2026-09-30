//
// Copyright 2026 DXOS.org
//

import { Switch as SwitchPrimitive } from '@ark-ui/react/switch';
import React, { type ReactNode, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';

export type SwitchProps = ThemedClassName<Omit<SwitchPrimitive.RootProps, 'children'>> & {
  /** Visible label beside the track; without one pass `aria-label`. */
  'label'?: ReactNode;
  'aria-label'?: string;
};

/** Ark switch with an icon-tall track; the root is a block-tall row so it lines up with other controls. */
export const Switch = forwardRef<HTMLLabelElement, SwitchProps>(
  ({ classNames, label, 'aria-label': ariaLabel, ...props }, forwardedRef) => (
    <SwitchPrimitive.Root {...props} className={mx(recipes.switch(), classNames)} ref={forwardedRef}>
      <SwitchPrimitive.Control className={recipes.switchControl()}>
        <SwitchPrimitive.Thumb className={recipes.switchThumb()} />
      </SwitchPrimitive.Control>
      {label && <SwitchPrimitive.Label>{label}</SwitchPrimitive.Label>}
      {/* The zag machine implements the switch keyboard contract (Space toggles), so the role is earned (follow-up 21). */}
      <SwitchPrimitive.HiddenInput role='switch' aria-label={ariaLabel} />
    </SwitchPrimitive.Root>
  ),
);

Switch.displayName = 'Next.Switch';
