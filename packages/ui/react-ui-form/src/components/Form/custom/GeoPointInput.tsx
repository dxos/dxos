//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { GeoLocation, type GeoPoint } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '../../../translations';
import { InputHeader, type InputProps } from '../Input';

export const GeoPointInput = ({ type, label, disabled, getStatus, getValue, onValueChange, onBlur }: InputProps) => {
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const geoPoint = useMemo<GeoPoint>(() => getValue<GeoPoint>() ?? [0, 0], [getValue]);
  const geoLocation = useMemo(() => GeoLocation.fromGeoPoint(geoPoint), [geoPoint]);

  const [longitudeText, setLongitudeText] = useState(geoLocation.longitude?.toString());
  const [latitudeText, setLatitudeText] = useState(geoLocation.latitude?.toString());

  useEffect(() => {
    const location = GeoLocation.fromGeoPoint(geoPoint);
    setLongitudeText(location.longitude.toString());
    setLatitudeText(location.latitude.toString());
  }, [geoPoint]);

  const handleCoordinateChange = useCallback(
    (coordinateType: keyof Pick<GeoLocation, 'longitude' | 'latitude'>, setText: (text: string) => void) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const inputText = event.target.value;
        setText(inputText);
        if (inputText !== '' && inputText !== '-') {
          const coord = safeParseFloat(inputText);
          if (coord !== undefined && !isNaN(coord)) {
            const currentLocation = GeoLocation.fromGeoPoint(getValue<GeoPoint>() ?? [0, 0]);
            const newLocation = { ...currentLocation, [coordinateType]: coord };
            const newValue = GeoLocation.toGeoPoint(newLocation);
            onValueChange(type, newValue);
          }
        }
      },
    [getValue, onValueChange, type],
  );

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error} label={label} />
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
