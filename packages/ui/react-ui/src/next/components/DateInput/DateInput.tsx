//
// Copyright 2026 DXOS.org
//

import { Field as FieldPrimitive } from '@ark-ui/react/field';
import React, { type InputHTMLAttributes, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';

export type DateInputType = 'date' | 'time' | 'datetime-local';

export type DateInputProps = ThemedClassName<Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>> & {
  'type'?: DateInputType;
  'data-testid'?: string;
};

const ICONS: Record<DateInputType, string> = {
  'date': 'ph--calendar-blank--regular',
  'time': 'ph--clock--regular',
  'datetime-local': 'ph--calendar-dots--regular',
};

/**
 * A native date, time or date-time input styled as a control, with a trailing calendar or clock Icon over the platform
 * picker button; inside a `Field.Root` the input takes the field's id, label and description wiring.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ classNames, type = 'date', 'data-testid': testId, ...props }, forwardedRef) => (
    <span data-scope='date-input' data-part='root' data-testid={testId} className={mx(recipes.dateInput(), classNames)}>
      <FieldPrimitive.Input
        {...props}
        type={type}
        data-scope='date-input'
        data-part='input'
        className={recipes.dateInputField()}
        ref={forwardedRef}
      />
      <Icon icon={ICONS[type]} />
    </span>
  ),
);

DateInput.displayName = 'Next.DateInput';
