//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState, useEffect } from 'react';

import { type GeoPoint } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '../../../translations';
import { InputHeader, type InputProps } from '../Input';

export const GeoPointInput = ({ type, label, disabled, getStatus, getValue, onValueChange, onBlur }: InputProps) => {
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const value = getValue<GeoPoint>() ?? [0, 0];

  const [longitudeText, setLongitudeText] = useState(value[0].toString());
  const [latitudeText, setLatitudeText] = useState(value[1].toString());

  useEffect(() => {
    setLongitudeText(value[0].toString());
    setLatitudeText(value[1].toString());
  }, [value]);

  const handleCoordinateChange = useCallback(
    (coordinateType: 'longitude' | 'latitude', setText: (text: string) => void) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputText = event.target.value;
        setText(inputText);
        if (inputText !== '' && inputText !== '-') {
          const coord = safeParseFloat(inputText);
          if (coord !== undefined && !isNaN(coord)) {
            const currentValue = getValue<GeoPoint>() ?? [0, 0];
            const newValue = [...currentValue] as [number, number];
            const index = coordinateType === 'longitude' ? 0 : 1;
            newValue[index] = coord;
            onValueChange(type, newValue);
          }
        }
      },
    [getValue, onValueChange, type],
  );

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <div role='none' className='grid grid-cols-2 gap-2'>
        <Input.TextInput
          type='text'
          pattern='^-?[0-9]*\.?[0-9]*$'
          disabled={disabled}
          placeholder={t('placeholder latitude')}
          value={latitudeText}
          onChange={handleCoordinateChange('latitude', setLatitudeText)}
          onBlur={onBlur}
        />
        <Input.TextInput
          type='text'
          pattern='^-?[0-9]*\.?[0-9]*$'
          disabled={disabled}
          placeholder={t('placeholder longitude')}
          value={longitudeText}
          onChange={handleCoordinateChange('longitude', setLongitudeText)}
          onBlur={onBlur}
        />
      </div>
    </Input.Root>
  );
};
