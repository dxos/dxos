//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useEffect, useState } from 'react';

import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { StepAnnotation } from '../../annotations.ts';
import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { getNumericConstraints } from './numeric-constraints.ts';

/** A fractional field without a declared step moves by 0.01 below magnitude 1, else by 0.1. */
const defaultStep = (value: number | undefined, integer: boolean): number =>
  integer ? 1 : value !== undefined && Math.abs(value) < 1 ? 0.01 : 0.1;

/** Ark's number input parses, steps and clamps on blur; the field commits every value that parses. */
export const NumberField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<number>) => {
  const { min, max, integer } = getNumericConstraints(type);
  const committed = getValue();
  // The text is kept locally so a partial edit ("1.", "-") survives until it parses.
  const [text, setText] = useState(committed === undefined ? '' : String(committed));
  useEffect(() => {
    if (committed !== undefined && Number(text) !== committed) {
      setText(String(committed));
    }
  }, [committed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (presentationFor(presentation).isStatic) {
    return <FormStaticValue value={committed} format={format} />;
  }

  return (
    <Input.Number
      disabled={!!readonly}
      placeholder={placeholder}
      min={min}
      max={max}
      step={Option.getOrElse(StepAnnotation.getFromAst(type), () => defaultStep(committed, integer))}
      formatOptions={integer ? { maximumFractionDigits: 0 } : { useGrouping: false }}
      value={text}
      onValueChange={(next, valueAsNumber) => {
        setText(next);
        if (!Number.isNaN(valueAsNumber)) {
          onValueChange(type, valueAsNumber);
          // A stepper press never blurs, so every value that parses commits itself, as a pick does.
          onBlur();
        }
      }}
    />
  );
};
