//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type GeoPoint } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '../../../translations';
import { InputHeader, type InputProps } from '../Input';

export const GeoPointInput = ({ type, label, disabled, getStatus, getValue, onValueChange, onBlur }: InputProps) => {
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const [lng = 0, lat = 0] = getValue<GeoPoint>() ?? [];

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
          onChange={(event) => onValueChange(type, [lat, safeParseFloat(event.target.value, 0)])}
          onBlur={onBlur}
        />
        <Input.TextInput
          type='number'
          disabled={disabled}
          placeholder={t('placeholder latitude')}
          value={lat}
          onChange={(event) => onValueChange(type, [safeParseFloat(event.target.value, 0), lng])}
          onBlur={onBlur}
        />
      </div>
    </Input.Root>
  );
};
