//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { GeoLocation, type GeoPoint } from '@dxos/echo/internal';
import { Input, useTranslation } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '../../../translations';
import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

export const GeoPointField = ({
  type,
  label,
  inline,
  readonly,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: FormFieldComponentProps<GeoPoint>) => {
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const geoPoint = useMemo<GeoPoint>(() => getValue() ?? [0, 0], [getValue]);
  const geoLocation = useMemo(() => GeoLocation.fromGeoPoint(geoPoint), [geoPoint]);

  const [longitudeText, setLongitudeText] = useState(geoLocation.longitude?.toString());
  const [latitudeText, setLatitudeText] = useState(geoLocation.latitude?.toString());
  useEffect(() => {
    const location = GeoLocation.fromGeoPoint(geoPoint);
    setLongitudeText(location.longitude?.toString());
    setLatitudeText(location.latitude?.toString());
  }, [geoPoint]);

  const handleChange = useCallback(
    (coordinateType: keyof Pick<GeoLocation, 'longitude' | 'latitude'>, setText: (text: string) => void) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const inputText = event.target.value;
        setText(inputText);
        if (inputText !== '' && inputText !== '-') {
          const coord = safeParseFloat(inputText);
          if (coord !== undefined && !isNaN(coord)) {
            const currentLocation = GeoLocation.fromGeoPoint(getValue() ?? [0, 0]);
            const newLocation = { ...currentLocation, [coordinateType]: coord };
            const newValue = GeoLocation.toGeoPoint(newLocation);
            onValueChange(type, newValue);
          }
        }
      },
    [type, getValue, onValueChange],
  );

  return (
    <Input.Root validationValence={status}>
      {!inline && <FormFieldLabel error={error} readonly={readonly} label={label} asChild />}
      <div role='none' className='grid grid-cols-2 gap-2'>
        <div>
          <Input.Root>
            {!inline && <Input.Label>{t('latitude label')}</Input.Label>}
            <Input.TextInput
              type='number'
              step='0.00001'
              min='-90'
              max='90'
              disabled={!!readonly}
              placeholder={inline ? t('latitude placeholder') : undefined}
              value={latitudeText ?? ''}
              onChange={handleChange('latitude', setLatitudeText)}
              onBlur={onBlur}
            />
          </Input.Root>
        </div>
        <div>
          <Input.Root>
            {!inline && <Input.Label>{t('longitude label')}</Input.Label>}
            <Input.TextInput
              type='number'
              step='0.00001'
              min='-180'
              max='180'
              disabled={!!readonly}
              placeholder={inline ? t('longitude placeholder') : undefined}
              value={longitudeText ?? ''}
              onChange={handleChange('longitude', setLongitudeText)}
              onBlur={onBlur}
            />
          </Input.Root>
        </div>
      </div>
    </Input.Root>
  );
};
