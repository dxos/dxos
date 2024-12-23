//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type BaseObject, type GeoPoint } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '../../../translations';
import { InputHeader, type InputProps } from '../Input';

export const GeoPointInput = <T extends BaseObject>({
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
  const [lng = 0, lat = 0] = getValue<GeoPoint>(property) ?? [];

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <div className='grid grid-cols-2 gap-2'>
        <Input.TextInput
          type='number'
          disabled={disabled}
          placeholder={t('placeholder longitude')}
          value={lng}
          onChange={(event) => onValueChange(property, type, [lat, safeParseFloat(event.target.value, 0)])}
          onBlur={onBlur}
        />
        <Input.TextInput
          type='number'
          disabled={disabled}
          placeholder={t('placeholder latitude')}
          value={lat}
          onChange={(event) => onValueChange(property, type, [safeParseFloat(event.target.value, 0), lng])}
          onBlur={onBlur}
        />
      </div>
    </Input.Root>
  );
};
