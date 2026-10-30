//
// Copyright 2026 DXOS.org
//

import { NumberInput as NumberInputPrimitive } from '@ark-ui/react/number-input';
import React, { type FocusEvent, type KeyboardEventHandler, type MouseEvent, forwardRef, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Button } from '../Button/Button.tsx';
import * as Popover from '../Popover/Popover.tsx';
import { Slider } from '../Slider/Slider.tsx';

/** Keys Ark steps the value by, rather than typing into it. */
const STEP_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

/** What changed a number input's value: a stepper press or arrow key, or typing. */
export type NumberInputChangeSource = 'step' | 'type';

/**
 * Where the decrement and increment buttons go: `end` (or `true`) trails the input with the pair, `start` leads it
 * with the pair, `split` puts decrement at the start and increment at the end, and `false` drops them (the arrow keys
 * still step).
 */
export type NumberInputStepper = boolean | 'start' | 'end' | 'split';

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
  /** `source` tells a stepper press or arrow key (`step`) from typing (`type`). */
  'onValueChange'?: (value: string, valueAsNumber: number, source: NumberInputChangeSource) => void;
  /** The value is committed: the input blurred, or Enter was pressed. */
  'onValueCommit'?: (value: string, valueAsNumber: number) => void;
  'onKeyDown'?: KeyboardEventHandler<HTMLInputElement>;
  'placeholder'?: string;
  'autoFocus'?: boolean;
  'stepper'?: NumberInputStepper;
  /**
   * Shows the stepper only while the row is hovered or focused, on the side away from the number (`start` when
   * `align='end'`, `end` otherwise) in place of `stepper`'s placement; it keeps its place, so the number never moves.
   */
  'stepperOnHover'?: boolean;
  /** Sizes just this input (`data-size` scopes `theme/size.css`'s metrics to it), whatever its enclosing scope. */
  'size'?: Size;
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
      onValueCommit,
      onKeyDown,
      placeholder,
      autoFocus,
      stepper = true,
      stepperOnHover,
      align = 'start',
      size,
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
    // Ark reports no cause with a change, so a press on a stepper or a stepping key marks the changes it makes.
    const stepping = useRef(false);
    const startStep = () => {
      stepping.current = true;
    };
    const endStep = () => {
      stepping.current = false;
    };
    const stepperProps = { onPointerDown: startStep, onPointerUp: endStep, onPointerLeave: endStep };
    const caretAtEnd = useCaretAtEnd();
    const placement =
      stepper && stepperOnHover ? (align === 'end' ? 'start' : 'end') : stepper === true ? 'end' : stepper;
    const reveal = stepperOnHover ? '' : undefined;
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
          {...stepperProps}
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
          {...stepperProps}
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
    const endPair = placement === 'end';
    return (
      <NumberInputPrimitive.Root
        {...props}
        value={value}
        defaultValue={defaultValue}
        onValueChange={
          onValueChange &&
          (({ value, valueAsNumber }) => onValueChange(value, valueAsNumber, stepping.current ? 'step' : 'type'))
        }
        onValueCommit={onValueCommit && (({ value, valueAsNumber }) => onValueCommit(value, valueAsNumber))}
        className={recipes.controlRoot()}
      >
        <NumberInputPrimitive.Control
          data-testid={testId}
          data-align={align}
          data-size={size}
          data-stepper={placement || undefined}
          className={mx(recipes.numberInput(), classNames)}
        >
          {(placement === 'start' || placement === 'split') && (
            <span data-scope='number-input' data-part='start' className={recipes.inputAdornment()}>
              {decrement}
              {placement === 'start' && increment}
            </span>
          )}
          <NumberInputPrimitive.Input
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label={ariaLabel}
            {...(align === 'end' ? caretAtEnd : {})}
            className={recipes.inputField()}
            onKeyDown={(event) => {
              stepping.current = STEP_KEYS.has(event.key);
              onKeyDown?.(event);
            }}
            onKeyUp={endStep}
            ref={forwardedRef}
          />
          {(sliderButton || endPair || placement === 'split') && (
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

const placeCaretAtEnd = (input: HTMLInputElement) => input.setSelectionRange(input.value.length, input.value.length);

/**
 * Focus handlers that put the caret after the last digit, where a right-aligned number is edited from. A click that
 * focuses the input places its own caret through mouseup, so that focus waits for the mouseup.
 */
const useCaretAtEnd = () => {
  const clickingRef = useRef(false);
  return {
    onMouseDown: (event: MouseEvent<HTMLInputElement>) => {
      clickingRef.current = event.currentTarget.ownerDocument.activeElement !== event.currentTarget;
    },
    onMouseUp: (event: MouseEvent<HTMLInputElement>) => {
      if (clickingRef.current) {
        clickingRef.current = false;
        placeCaretAtEnd(event.currentTarget);
      }
    },
    onFocus: (event: FocusEvent<HTMLInputElement>) => {
      if (!clickingRef.current) {
        placeCaretAtEnd(event.currentTarget);
      }
    },
  };
};

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
