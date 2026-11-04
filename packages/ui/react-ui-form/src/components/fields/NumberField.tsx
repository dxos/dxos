//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useEffect, useState } from 'react';

import * as Input from '@dxos/react-ui/Input';
import { type NumberLayout } from '@dxos/ui-types';

import { type FormFieldRendererProps } from '#types';

import { StepAnnotation } from '../../annotations.ts';
import { useFormContext } from '../../hooks/index.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { type NumberEditEvent, type NumberEditState, numberEdit } from './number-edit.ts';
import { numberLayoutOf } from './number-layout.ts';
import { getNumericConstraints } from './numeric-constraints.ts';

/** A fractional field without a declared step moves by 0.01 below magnitude 1, else by 0.1. */
const defaultStep = (value: number | undefined, integer: boolean): number =>
  integer ? 1 : value !== undefined && Math.abs(value) < 1 ? 0.01 : 0.1;

/** What {@link useNumberFieldInput} reads: the property's type, bounds and form state. */
export type NumberFieldInputProps = Pick<
  FormFieldRendererProps<number>,
  'type' | 'readonly' | 'placeholder' | 'min' | 'max' | 'step' | 'getValue' | 'onValueChange' | 'onBlur' | 'onRevert'
>;

/** What a number field binds to its `Input.Number`, and its committed value for a static presentation. */
export type NumberFieldInput = {
  committed: number | undefined;
  inputProps: Input.NumberProps;
};

/**
 * Ark's number input parses, steps and clamps on blur. A stepper press commits at once; a typed value commits as it
 * parses, or on blur and Enter when the form commits on blur; Escape puts the committed value back. Shared by every
 * number control the form draws (a field, a vector's axes); `defaultLayout` applies where the schema declares none.
 */
export const useNumberFieldInput = (
  {
    type,
    readonly,
    placeholder,
    min: minProp,
    max: maxProp,
    step: stepProp,
    getValue,
    onValueChange,
    onBlur,
    onRevert,
  }: NumberFieldInputProps,
  defaultLayout: NumberLayout = {},
): NumberFieldInput => {
  const {
    form: { commitOn },
  } = useFormContext('NumberField');
  const constraints = getNumericConstraints(type);
  const layout = { ...defaultLayout, ...numberLayoutOf(type) };
  // A caller's override narrows the schema's bounds for this form; a whole-number step reads as an integer.
  const min = minProp ?? constraints.min;
  const max = maxProp ?? constraints.max;
  const integer = constraints.integer || (stepProp !== undefined && Number.isInteger(stepProp));
  const step = stepProp ?? Option.getOrElse(StepAnnotation.getFromAst(type), () => undefined);
  // A fractional step sets the value's precision, so a 0.1 step commits tenths.
  const decimals = step !== undefined && step < 1 ? Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) : undefined;
  const round = (value: number) => (decimals === undefined ? value : Number(value.toFixed(decimals)));
  // Out of bounds is held back rather than clamped, so a partial edit on the way in (a 1 towards 15, minimum 10)
  // survives; Ark clamps it on blur, which commits.
  const inBounds = (value: number) => (min === undefined || value >= min) && (max === undefined || value <= max);
  const committed = getValue();
  // The text is kept locally so a partial edit ("1.", "-") survives until it parses, and a value typed into a form that
  // commits on blur waits here until the field blurs.
  const [edit, setEdit] = useState<NumberEditState>({ text: committed === undefined ? '' : String(committed) });
  useEffect(() => {
    // An outside change (a drag, a peer) shows, unless the user is mid-edit with a value not yet committed.
    if (committed !== undefined && Number(edit.text) !== committed && edit.pending === undefined) {
      setEdit({ text: String(committed) });
    }
  }, [committed]); // eslint-disable-line react-hooks/exhaustive-deps
  const dispatch = (event: NumberEditEvent) => {
    const result = numberEdit(edit, event, { commitOn, committed });
    setEdit(result.state);
    if (result.commit !== undefined && inBounds(result.commit)) {
      onValueChange(type, result.commit);
      // A stepper press never blurs, so a committed value commits itself, as a pick does.
      onBlur();
    }
    if (result.restore !== undefined) {
      onRevert();
    }
  };

  return {
    committed,
    inputProps: {
      disabled: !!readonly,
      placeholder,
      align: layout.align,
      stepperOnHover: layout.stepperOnHover,
      size: layout.size,
      min,
      max,
      step: step ?? defaultStep(committed, integer),
      formatOptions: integer ? { maximumFractionDigits: 0 } : { useGrouping: false },
      value: edit.text,
      onValueChange: (next, valueAsNumber, source) => {
        const rounded = Number.isNaN(valueAsNumber) ? valueAsNumber : round(valueAsNumber);
        // A digit past the step's precision is dropped as it is typed, so the text is what commits.
        const text = rounded === valueAsNumber || Number.isNaN(rounded) ? next : String(rounded);
        dispatch({ kind: source, text, value: rounded });
      },
      onValueCommit: () => dispatch({ kind: 'commit' }),
      onKeyDown: (event) => {
        if (event.key === 'Escape') {
          dispatch({ kind: 'revert' });
        }
      },
    },
  };
};

/** A number property's control (see {@link useNumberFieldInput}). */
export const NumberField = (props: FormFieldRendererProps<number>) => {
  const { committed, inputProps } = useNumberFieldInput(props);
  if (presentationFor(props.presentation).isStatic) {
    return <FormStaticValue value={committed} format={props.format} />;
  }

  return <Input.Number {...inputProps} />;
};
