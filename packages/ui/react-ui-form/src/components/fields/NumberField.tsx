//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Next } from '@dxos/react-ui/next';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';
import { getNumericConstraints } from './numeric-constraints.ts';

/** Ark's number input parses, steps and clamps on blur; the field commits every value that parses. */
export const NumberField = ({
  type,
  format,
  readonly,
  placeholder,
  presentation,
  getValue,
  onValueChange,
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
    <Next.NumberInput
      disabled={!!readonly}
      placeholder={placeholder}
      min={min}
      max={max}
      step={integer ? 1 : undefined}
      formatOptions={integer ? { maximumFractionDigits: 0 } : { useGrouping: false }}
      value={text}
      onValueChange={(next, valueAsNumber) => {
        setText(next);
        if (!Number.isNaN(valueAsNumber)) {
          onValueChange(type, valueAsNumber);
        }
      }}
    />
  );
};
