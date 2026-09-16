//
// Copyright 2026 DXOS.org
//

import React, { type ChangeEvent } from 'react';

import { Field } from '@dxos/react-ui';

export type RangeValue = { min?: number; max?: number };

export type RangeFieldProps = {
  label?: string;
  value?: RangeValue;
  onValueChange?: (value: RangeValue) => void;
};

/** Paired min/max numeric inputs for a range search field (e.g. price from/to, year from/to). */
export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) => {
  const update = (key: 'min' | 'max') => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    // Guard against transient non-numeric input (e.g. a lone '-'): treat NaN as cleared.
    const parsed = raw === '' ? undefined : Number(raw);
    onValueChange?.({ ...value, [key]: parsed != null && Number.isNaN(parsed) ? undefined : parsed });
  };
  return (
    <Field.Root>
      {label && <Field.Label>{label}</Field.Label>}
      <div className='grid grid-cols-2 gap-2'>
        <Field.Input type='number' placeholder='Min' value={value?.min ?? ''} onChange={update('min')} />
        <Field.Input type='number' placeholder='Max' value={value?.max ?? ''} onChange={update('max')} />
      </div>
    </Field.Root>
  );
};
