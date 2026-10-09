//
// Copyright 2026 DXOS.org
//

import React, { type ChangeEvent } from 'react';

import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

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
      <Layout.Grid cols={2} gap='sm'>
        <Input.Root placeholder='Min' value={value?.min ?? ''} onChange={update('min')} type='number' />
        <Input.Root placeholder='Max' value={value?.max ?? ''} onChange={update('max')} type='number' />
      </Layout.Grid>
    </Field.Root>
  );
};
