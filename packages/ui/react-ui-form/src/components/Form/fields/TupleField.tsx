//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { safeParseFloat } from '@dxos/util';

import { FormInputHeader, type FormInputProps } from '../FormInput';

const gridCols = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'];

export const TupleField = ({
  binding,
  type,
  label,
  readonly,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: FormInputProps & { binding: string[] }) => {
  const { status, error } = getStatus();

  // TODO(burdon): Generalize number/float/string, etc.
  const values: Record<string, number> = getValue<Record<string, number>>() ?? {};

  return (
    <Input.Root validationValence={status}>
      <FormInputHeader error={error} label={label} />
      <div className={mx('grid gap-2', gridCols[binding.length - 1])}>
        {binding.map((prop) => (
          <Input.TextInput
            key={prop}
            type='number'
            disabled={!!readonly}
            value={values[prop]}
            onChange={(event) => onValueChange(type, { ...values, [prop]: safeParseFloat(event.target.value, 0) })}
            onBlur={onBlur}
          />
        ))}
      </div>
    </Input.Root>
  );
};
