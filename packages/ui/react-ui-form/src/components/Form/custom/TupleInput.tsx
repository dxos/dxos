//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type BaseObject } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { safeParseFloat } from '@dxos/util';

import { InputHeader, type InputProps } from '../Input';

const gridCols = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'];

export const TupleInput = <T extends BaseObject>({
  binding,
  property,
  type,
  label,
  disabled,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps<T> & { binding: string[] }) => {
  const { status, error } = getStatus?.(property);

  // TODO(burdon): Generalize number/float/string, etc.
  const values: Record<string, number> = getValue<Record<string, number>>(property) ?? {};

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <div className={mx('grid gap-2', gridCols[binding.length - 1])}>
        {binding.map((prop) => (
          <Input.TextInput
            key={prop}
            type='number'
            disabled={disabled}
            value={values[prop]}
            onChange={(event) =>
              onValueChange(property, type, { ...values, [prop]: safeParseFloat(event.target.value, 0) })
            }
            onBlur={onBlur}
          />
        ))}
      </div>
    </Input.Root>
  );
};
