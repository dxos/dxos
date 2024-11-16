//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input } from '@dxos/react-ui';

import { type InputProps } from '../../hooks';

//
// Custom format components.
//

export const LatLngInput = <T extends object>({
  property,
  type,
  label,
  disabled,
  getErrorValence,
  getErrorMessage,
  getValue,
  onValueChange,
  onBlur,
}: InputProps<T>) => {
  const errorValence = getErrorValence?.(property);
  const errorMessage = getErrorMessage?.(property);

  // TODO(burdon): Property path.

  return (
    <Input.Root validationValence={errorValence}>
      <Input.Label>{label}</Input.Label>
      <div className='grid grid-cols-2 gap-2'>
        <Input.DescriptionAndValidation>
          <Input.TextInput
            type={type}
            disabled={disabled}
            placeholder={'Latitude'}
            value={getValue(property, type) ?? ''}
            onChange={(event) => onValueChange(property, type, event.target.value)}
            onBlur={onBlur}
          />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
        <Input.DescriptionAndValidation>
          <Input.TextInput
            type={type}
            disabled={disabled}
            placeholder={'Longitude'}
            value={getValue(property, type) ?? ''}
            onChange={(event) => onValueChange(property, type, event.target.value)}
            onBlur={onBlur}
          />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </div>
    </Input.Root>
  );
};
