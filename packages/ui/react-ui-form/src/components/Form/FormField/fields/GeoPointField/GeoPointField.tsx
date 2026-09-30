//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { GeoLocation, type GeoPoint } from '@dxos/echo/Format';
import { Field, useTranslation } from '@dxos/react-ui';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { presentationFor } from '../../presentation.tsx';

export const GeoPointField = ({
  type,
  readonly,
  presentation,
  getValue,
  onValueChange,
  onBlur,
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

  const resolved = presentationFor(presentation);
  if (resolved.isStatic) {
    // A zero coordinate pair is no location.
    return !value.latitude && !value.longitude ? null : <LatLng {...value} />;
  }

  return (
    // Each coordinate in its own cell: `Field.Root` lays out as `contents`, so without the cell its
    // label and input would land in the grid as two items of their own.
    <div className='grid grid-cols-2 gap-form-gap'>
      <div>
        <Field.Root>
          {resolved.showLabel && <Field.Label>{t('latitude.label')}</Field.Label>}
          <Field.Input
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
        </Field.Root>
      </div>
      <div>
        <Field.Root>
          {resolved.showLabel && <Field.Label>{t('longitude.label')}</Field.Label>}
          <Field.Input
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
        </Field.Root>
      </div>
    </div>
  );
};

// Two labelled inputs: the row's label names neither.
GeoPointField.standalone = true;

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
