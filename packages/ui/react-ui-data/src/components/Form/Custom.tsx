//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type LatLng } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';

import { InputHeader } from './Defaults';
import { type InputProps } from '../../hooks';
import { translationKey } from '../../translations';

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
  const { t } = useTranslation(translationKey);
  const errorValence = getErrorValence?.(property);
  const errorMessage = getErrorMessage?.(property);

  const { lat = 0, lng = 0 } = getValue<LatLng>(property, type) ?? {};

  return (
    <Input.Root validationValence={errorValence}>
      <InputHeader error={errorMessage}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <div className='grid grid-cols-2 gap-2'>
        <Input.TextInput
          type='number'
          disabled={disabled}
          placeholder={t('placeholder latitude')}
          value={lat}
          onChange={(event) => onValueChange(property, type, { lat: safeParseFloat(event.target.value, 0), lng })}
          onBlur={onBlur}
        />
        <Input.TextInput
          type='number'
          disabled={disabled}
          placeholder={t('placeholder longitude')}
          value={lng}
          onChange={(event) => onValueChange(property, type, { lat, lng: safeParseFloat(event.target.value, 0) })}
          onBlur={onBlur}
        />
      </div>
    </Input.Root>
  );
};

// TODO(burdon): Utils.

const safeParseInt = (str: string, defaultValue?: number): number | undefined => {
  const value = parseInt(str);
  return isNaN(value) ? defaultValue : value;
};

const safeParseFloat = (str: string, defaultValue?: number): number | undefined => {
  try {
    return parseFloat(str);
  } catch {
    return defaultValue ?? 0;
  }
};
