//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { type GeoPoint, GeoLocation } from '@dxos/echo/Format';
import { Input, useTranslation } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { FormRow } from '../../FormRow';

export const GeoPointField = ({
  type,
  readonly,
  getValue,
  onValueChange,
  onBlur,
  ...props
}: FormFieldRendererProps<GeoPoint>) => {
  const { t } = useTranslation(translationKey);
  const geoPoint = useMemo<GeoPoint>(() => getValue() ?? [0, 0], [getValue]);
  const value = useMemo(() => GeoLocation.fromGeoPoint(geoPoint), [geoPoint]);

  const [longitudeText, setLongitudeText] = useState(value.longitude?.toString());
  const [latitudeText, setLatitudeText] = useState(value.latitude?.toString());
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
    <FormRow<GeoPoint>
      readonly={readonly}
      getValue={getValue}
      standalone
      renderStatic={(point) => {
        const location = GeoLocation.fromGeoPoint(point ?? [0, 0]);
        // Treat a zero coordinate pair as empty (no meaningful location to display).
        return !location.latitude && !location.longitude ? null : <LatLng {...location} />;
      }}
      {...props}
    >
      {({ presentation }) => (
        <div className='grid grid-cols-2 gap-form-gap'>
          <div>
            <Input.Root>
              {presentation.showLabel && <Input.Label>{t('latitude.label')}</Input.Label>}
              <Input.TextInput
                type='number'
                step='0.00001'
                min='-90'
                max='90'
                disabled={!!readonly}
                placeholder={t('latitude.placeholder')}
                value={latitudeText ?? ''}
                onChange={handleChange('latitude', setLatitudeText)}
                onBlur={onBlur}
              />
            </Input.Root>
          </div>
          <div>
            <Input.Root>
              {presentation.showLabel && <Input.Label>{t('longitude.label')}</Input.Label>}
              <Input.TextInput
                type='number'
                step='0.00001'
                min='-180'
                max='180'
                disabled={!!readonly}
                placeholder={t('longitude.placeholder')}
                value={longitudeText ?? ''}
                onChange={handleChange('longitude', setLongitudeText)}
                onBlur={onBlur}
              />
            </Input.Root>
          </div>
        </div>
      )}
    </FormRow>
  );
};

const LatLng = ({ latitude = 0, longitude = 0 }: GeoLocation) => {
  const latHem = latitude >= 0 ? 'N' : 'S';
  const lngHem = longitude >= 0 ? 'E' : 'W';

  return (
    <span className='inline-flex items-center gap-form-gap'>
      <span>
        <span>{Math.abs(latitude).toFixed(5)}</span>
        <span className='text-subdued'>°{latHem}</span>
      </span>
      <span>
        <span>{Math.abs(longitude).toFixed(5)}</span>
        <span className='text-subdued'>°{lngHem}</span>
      </span>
    </span>
  );
};
