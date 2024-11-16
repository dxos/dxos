//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type LatLng } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';

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

  const { lat = '', lng = '' } = getValue<LatLng>(property, type) ?? {};
  console.log('::::', lat, lng);

  return (
    <Input.Root validationValence={errorValence}>
      <Input.Label>{label}</Input.Label>
      <div className='grid grid-cols-2 gap-2'>
        <Input.DescriptionAndValidation>
          <Input.TextInput
            type={type}
            disabled={disabled}
            placeholder={t('placeholder latitude')}
            value={lat}
            onChange={(event) => onValueChange(property, type, { lat: event.target.value, lng })}
            onBlur={onBlur}
          />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
        <Input.DescriptionAndValidation>
          <Input.TextInput
            type={type}
            disabled={disabled}
            placeholder={t('placeholder longitude')}
            value={lng}
            onChange={(event) => onValueChange(property, type, { lat, lng: event.target.value })}
            onBlur={onBlur}
          />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </div>
    </Input.Root>
  );
};
