//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { GeoLocation, type GeoPoint } from '@dxos/echo/Format';
import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { safeParseFloat } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { presentationFor } from '../presentation.tsx';

type Coordinate = keyof Pick<GeoLocation, 'latitude' | 'longitude'>;

/** Two labelled coordinates in a row Container of two equal tracks, each its own `Field.Root`. */
export const GeoPointField = ({
  type,
  readonly,
  presentation,
  getValue,
  onValueChange,
}: FormFieldRendererProps<GeoPoint>) => {
  const { t } = useTranslation(translationKey);
  const geoPoint = getValue();
  const location = useMemo(() => GeoLocation.fromGeoPoint(geoPoint ?? [0, 0]), [geoPoint]);
  const [text, setText] = useState({
    latitude: location.latitude?.toString() ?? '',
    longitude: location.longitude?.toString() ?? '',
  });
  useEffect(() => {
    setText({ latitude: location.latitude?.toString() ?? '', longitude: location.longitude?.toString() ?? '' });
  }, [location]);

  const resolved = presentationFor(presentation);
  if (resolved.isStatic) {
    return !location.latitude && !location.longitude ? null : (
      <Next.Typography truncate>
        {Math.abs(location.latitude ?? 0).toFixed(5)}°{(location.latitude ?? 0) >= 0 ? 'N' : 'S'}{' '}
        {Math.abs(location.longitude ?? 0).toFixed(5)}°{(location.longitude ?? 0) >= 0 ? 'E' : 'W'}
      </Next.Typography>
    );
  }

  const handleChange = (coordinate: Coordinate, input: string) => {
    setText((previous) => ({ ...previous, [coordinate]: input }));
    const parsed = safeParseFloat(input);
    if (input !== '-' && parsed !== undefined && !Number.isNaN(parsed)) {
      onValueChange(type, GeoLocation.toGeoPoint({ ...location, [coordinate]: parsed }));
    }
  };

  const coordinate = (name: Coordinate, bound: number) => (
    <Next.Field.Root>
      {resolved.showLabel && (
        <Next.Field.Header>
          <Next.Field.Label>{t(`${name}.label`)}</Next.Field.Label>
        </Next.Field.Header>
      )}
      <Next.Input
        type='number'
        step='0.00001'
        min={-bound}
        max={bound}
        disabled={!!readonly}
        placeholder={t(`${name}.placeholder`)}
        value={text[name]}
        onChange={(event) => handleChange(name, event.target.value)}
      />
    </Next.Field.Root>
  );

  return (
    <Next.Container layout='row' gutter='inherit' columns='minmax(0, 1fr) minmax(0, 1fr)' gap='sm'>
      {coordinate('latitude', 90)}
      {coordinate('longitude', 180)}
    </Next.Container>
  );
};

GeoPointField.standalone = true;
