//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { useCallback, useMemo, useState } from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { FormatEnum } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput, useFormValues } from '@dxos/react-ui-form';
import { type LatLngLiteral } from '@dxos/react-ui-geo';
import { DataType } from '@dxos/schema';

import { MapCapabilities } from './capabilities';
import { MapContainer } from '../components';
import { MapViewEditor } from '../components/MapViewEditor';
import { MAP_PLUGIN } from '../meta';
import { LocationAnnotationId, MapView } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${MAP_PLUGIN}/map`,
      role: ['article', 'section'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(MapView, data.subject.presentation),
      component: ({ data, role }) => {
        const state = useCapability(MapCapabilities.MutableState);
        const [center, setCenter] = useState<LatLngLiteral>({ lat: 0, lng: 0 });
        const [zoom, setZoom] = useState(14);

        const handleChange = useCallback(({ center, zoom }: { center: LatLngLiteral; zoom: number }) => {
          setCenter(center);
          setZoom(zoom);
        }, []);

        return (
          <MapContainer
            role={role}
            type={state.type}
            view={data.subject}
            center={center}
            zoom={zoom}
            onChange={handleChange}
          />
        );
      },
    }),
    // createSurface({
    //   id: 'plugin-map',
    //   role: 'card--extrinsic',
    //   filter: (data) => Obj.instanceOf(MapType, data),
    //   component: ({ data }) => {
    //     const [lng = 0, lat = 0] = data?.coordinates ?? [];
    //     return <MapControl center={{ lat, lng }} zoom={14} />;
    //   },
    // }),
    createSurface({
      id: `${MAP_PLUGIN}/object-settings`,
      role: 'object-settings',
      position: 'hoist',
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(MapView, data.subject.presentation.target),
      component: ({ data }) => <MapViewEditor view={data.subject} />,
    }),
    createSurface({
      id: `${MAP_PLUGIN}/create-initial-schema-form-[property-of-interest]`,
      role: 'form-input',
      filter: (
        data,
      ): data is { prop: string; schema: Schema.Schema<any>; target: Space | DataType.Collection | undefined } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, LocationAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }
        const { initialSchema } = useFormValues();
        const [selectedSchema] = space?.db.schemaRegistry.query({ typename: initialSchema }).runSync();

        const coordinateProperties = useMemo(() => {
          if (!selectedSchema?.jsonSchema?.properties) {
            return [];
          }

          // Look for properties that use the LatLng format enum
          const properties = Object.entries(selectedSchema.jsonSchema.properties).reduce<string[]>(
            (acc, [key, value]) => {
              if (typeof value === 'object' && value?.format === FormatEnum.GeoPoint) {
                acc.push(key);
              }
              return acc;
            },
            [],
          );

          return properties;
        }, [selectedSchema?.jsonSchema]);

        if (!initialSchema) {
          return null;
        }

        return <SelectInput {...props} options={coordinateProperties.map((property) => ({ value: property }))} />;
      },
    }),
  ]);
