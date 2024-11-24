//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type BaseObject, type LatLng } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';

import { InputHeader, type InputProps } from './Input';
import { translationKey } from '../../translations';

//
// Custom format components.
//

export const LatLngInput = <T extends BaseObject>({
  property,
  type,
  label,
  disabled,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps<T>) => {
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus?.(property);
  const { lat = 0, lng = 0 } = getValue<LatLng>(property) ?? {};

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
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

// TODO(burdon): Factor out.
const safeParseFloat = (str: string, defaultValue?: number): number | undefined => {
  try {
    return parseFloat(str);
  } catch {
    return defaultValue ?? 0;
  }
};
