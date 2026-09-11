//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Field } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { safeParseFloat } from '@dxos/util';

import { type FormFieldRendererProps } from '#types';

const gridCols = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'];

export const TupleField = ({
  binding,
  type,
  readonly,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldRendererProps<Record<string, number>> & {
  binding: string[];
}) => {
  // TODO(burdon): Generalize number/float/string, etc.
  const values: Record<string, number> = getValue() ?? {};

  return (
    <div className={mx('grid gap-form-gap', gridCols[binding.length - 1])}>
      {binding.map((prop) => (
        <Field.Input
          key={prop}
          type='number'
          disabled={!!readonly}
          value={values[prop]}
          onChange={(event) => {
            onValueChange(type, {
              ...values,
              [prop]: safeParseFloat(event.target.value, 0),
            });
          }}
          onBlur={onBlur}
        />
      ))}
    </div>
  );
};

// Several inputs: the row's label names none of them.
TupleField.standalone = true;
