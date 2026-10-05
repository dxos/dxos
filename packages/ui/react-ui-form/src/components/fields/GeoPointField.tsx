//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { GeoLocation, type GeoPoint } from '@dxos/echo/Format';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
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
  const { t } = Hooks.useTranslation(translationKey);
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
      <Typography.Text truncate>
        {Math.abs(location.latitude ?? 0).toFixed(5)}°{(location.latitude ?? 0) >= 0 ? 'N' : 'S'}{' '}
        {Math.abs(location.longitude ?? 0).toFixed(5)}°{(location.longitude ?? 0) >= 0 ? 'E' : 'W'}
      </Typography.Text>
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
    <Field.Root>
      {resolved.showLabel && (
        <Field.Header>
          <Field.Label>{t(`${name}.label`)}</Field.Label>
        </Field.Header>
      )}
      <Input.Root
        type='number'
        step='0.00001'
        min={-bound}
        max={bound}
        disabled={!!readonly}
        placeholder={t(`${name}.placeholder`)}
        value={text[name]}
        onChange={(event) => handleChange(name, event.target.value)}
      />
    </Field.Root>
  );

  return (
    <Layout.Container layout='row' gutter='inherit' columns='minmax(0, 1fr) minmax(0, 1fr)' gap='sm'>
      {coordinate('latitude', 90)}
      {coordinate('longitude', 180)}
    </Layout.Container>
  );
};

GeoPointField.standalone = true;
