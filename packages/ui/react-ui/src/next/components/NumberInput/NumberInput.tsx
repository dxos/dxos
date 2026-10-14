//
// Copyright 2026 DXOS.org
//

import { NumberInput as NumberInputPrimitive } from '@ark-ui/react/number-input';
import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { Button } from '../Button/Button.tsx';

export type NumberInputProps = ThemedClassName<
  Pick<
    NumberInputPrimitive.RootProps,
    | 'min'
    | 'max'
    | 'step'
    | 'formatOptions'
    | 'locale'
    | 'allowMouseWheel'
    | 'clampValueOnBlur'
    | 'inputMode'
    | 'disabled'
    | 'readOnly'
    | 'required'
    | 'invalid'
    | 'name'
    | 'form'
  >
> & {
  /** The formatted text; `valueAsNumber` in `onValueChange` is the number (NaN when empty). */
  'value'?: string;
  'defaultValue'?: string;
  'onValueChange'?: (value: string, valueAsNumber: number) => void;
  'placeholder'?: string;
  'autoFocus'?: boolean;
  /** Hide the trailing decrement and increment buttons (the arrow keys still step). */
  'stepper'?: boolean;
  /** Overrides the translated `number-input.increment.label`. */
  'incrementLabel'?: string;
  /** Overrides the translated `number-input.decrement.label`. */
  'decrementLabel'?: string;
  'aria-label'?: string;
  'data-testid'?: string;
};

/**
 * Ark number input in a control row: a text input that parses and formats by locale, steps by `step` with ArrowUp/Down
 * (and PageUp/Down), clamps to `min`/`max` on blur, with trailing decrement and increment buttons (`compact`, so the
 * pair abuts). Inside a `Field.Root` the input takes the field's id, label, description and state. `data-testid` goes
 * to the row, the ref to the input.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      classNames,
      value,
      defaultValue,
      onValueChange,
      placeholder,
      autoFocus,
      stepper = true,
      incrementLabel,
      decrementLabel,
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    return (
      <NumberInputPrimitive.Root
        {...props}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange && (({ value, valueAsNumber }) => onValueChange(value, valueAsNumber))}
        className={recipes.controlRoot()}
      >
        <NumberInputPrimitive.Control data-testid={testId} className={mx(recipes.numberInput(), classNames)}>
          <NumberInputPrimitive.Input
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label={ariaLabel}
            className={recipes.inputField()}
            ref={forwardedRef}
          />
          {stepper && (
            <span data-scope='number-input' data-part='end' className={recipes.inputAdornment()}>
              <NumberInputPrimitive.DecrementTrigger asChild>
                <Button
                  icon='ph--minus--regular'
                  label={decrementLabel ?? t('number-input.decrement.label')}
                  iconOnly
                  compact
                  variant='ghost'
                  showTooltip={false}
                />
              </NumberInputPrimitive.DecrementTrigger>
              <NumberInputPrimitive.IncrementTrigger asChild>
                <Button
                  icon='ph--plus--regular'
                  label={incrementLabel ?? t('number-input.increment.label')}
                  iconOnly
                  compact
                  variant='ghost'
                  showTooltip={false}
                />
              </NumberInputPrimitive.IncrementTrigger>
            </span>
          )}
        </NumberInputPrimitive.Control>
      </NumberInputPrimitive.Root>
    );
  },
);

NumberInput.displayName = 'NumberInput';
