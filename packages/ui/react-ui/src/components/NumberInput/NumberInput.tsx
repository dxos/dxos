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
import * as Popover from '../Popover/Popover.tsx';
import { Slider } from '../Slider/Slider.tsx';

/**
 * Where the decrement and increment buttons go: `end` (or `true`) trails the input with the pair, `split` puts
 * decrement at the start and increment at the end, `hover` trails the pair but shows it only while the row is hovered
 * or focused, and `false` drops them (the arrow keys still step).
 */
export type NumberInputStepper = boolean | 'end' | 'split' | 'hover';

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
  'stepper'?: NumberInputStepper;
  /** Aligns the number to the row's end, as figures in a column do. */
  'align'?: 'start' | 'end';
  /** Adds an end button that opens a slider over `min`..`max` (0..100 when unset). */
  'slider'?: boolean;
  /** Overrides the translated `number-input.increment.label`. */
  'incrementLabel'?: string;
  /** Overrides the translated `number-input.decrement.label`. */
  'decrementLabel'?: string;
  /** Overrides the translated `number-input.slider.label`. */
  'sliderLabel'?: string;
  'aria-label'?: string;
  'data-testid'?: string;
};

const SLIDER_RANGE = { min: 0, max: 100 };

/**
 * Ark number input in a control row: a text input that parses and formats by locale, steps by `step` with ArrowUp/Down
 * (and PageUp/Down), clamps to `min`/`max` on blur, with compact decrement and increment buttons placed by `stepper`
 * and an optional slider button. Inside a `Field.Root` the input takes the field's id, label, description and state.
 * `data-testid` goes to the row, the ref to the input.
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
      align = 'start',
      slider,
      incrementLabel,
      decrementLabel,
      sliderLabel,
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const placement = stepper === true ? 'end' : stepper;
    const reveal = placement === 'hover' ? '' : undefined;
    const decrement = (
      <NumberInputPrimitive.DecrementTrigger asChild>
        <Button
          icon='ph--minus--regular'
          label={decrementLabel ?? t('number-input.decrement.label')}
          iconOnly
          compact
          variant='ghost'
          showTooltip={false}
          data-reveal={reveal}
        />
      </NumberInputPrimitive.DecrementTrigger>
    );
    const increment = (
      <NumberInputPrimitive.IncrementTrigger asChild>
        <Button
          icon='ph--plus--regular'
          label={incrementLabel ?? t('number-input.increment.label')}
          iconOnly
          compact
          variant='ghost'
          showTooltip={false}
          data-reveal={reveal}
        />
      </NumberInputPrimitive.IncrementTrigger>
    );
    const sliderButton = slider && (
      <NumberInputSlider
        label={sliderLabel ?? t('number-input.slider.label')}
        min={props.min ?? SLIDER_RANGE.min}
        max={props.max ?? SLIDER_RANGE.max}
        step={props.step}
        disabled={props.disabled || props.readOnly}
      />
    );
    const endPair = placement === 'end' || placement === 'hover';

    return (
      <NumberInputPrimitive.Root
        {...props}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange && (({ value, valueAsNumber }) => onValueChange(value, valueAsNumber))}
        className={recipes.controlRoot()}
      >
        <NumberInputPrimitive.Control
          data-testid={testId}
          data-align={align}
          data-stepper={placement || undefined}
          className={mx(recipes.numberInput(), classNames)}
        >
          {placement === 'split' && (
            <span data-scope='number-input' data-part='start' className={recipes.inputAdornment()}>
              {decrement}
            </span>
          )}
          <NumberInputPrimitive.Input
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label={ariaLabel}
            className={recipes.inputField()}
            ref={forwardedRef}
          />
          {(sliderButton || placement) && (
            <span data-scope='number-input' data-part='end' className={recipes.inputAdornment()}>
              {endPair && decrement}
              {(endPair || placement === 'split') && increment}
              {sliderButton}
            </span>
          )}
        </NumberInputPrimitive.Control>
      </NumberInputPrimitive.Root>
    );
  },
);

NumberInput.displayName = 'NumberInput';

type NumberInputSliderProps = {
  label: string;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
};

/** An icon button that opens a slider bound to the enclosing number input's value. */
const NumberInputSlider = ({ label, min, max, step, disabled }: NumberInputSliderProps) => (
  <NumberInputPrimitive.Context>
    {(api) => (
      <Popover.Root positioning={{ placement: 'bottom-end' }}>
        <Popover.Trigger asChild>
          <Button
            icon='ph--sliders-horizontal--regular'
            label={label}
            iconOnly
            compact
            variant='ghost'
            showTooltip={false}
            disabled={disabled}
          />
        </Popover.Trigger>
        <Popover.Content classNames='w-[16rem] p-2'>
          <Slider
            aria-label={label}
            min={min}
            max={max}
            step={step}
            value={[Number.isNaN(api.valueAsNumber) ? min : api.valueAsNumber]}
            onValueChange={([next]) => api.setValue(next)}
          />
        </Popover.Content>
      </Popover.Root>
    )}
  </NumberInputPrimitive.Context>
);
