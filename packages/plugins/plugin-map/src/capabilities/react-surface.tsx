//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { FormatEnum, isInstanceOf, type S } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { type CollectionType } from '@dxos/plugin-space/types';
import { getSpace, isSpace, type Space } from '@dxos/react-client/echo';
import { type InputProps, SelectInput, useFormValues } from '@dxos/react-ui-form';
import { type LatLngLiteral } from '@dxos/react-ui-geo';

import { MapCapabilities } from './capabilities';
import { MapContainer, MapControl } from '../components';
import { MapViewEditor } from '../components/MapViewEditor';
import { MAP_PLUGIN } from '../meta';
import { InitialSchemaAnnotationId, MapType, LocationPropertyAnnotationId } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${MAP_PLUGIN}/map`,
      role: ['article', 'section'],
      filter: (data): data is { subject: MapType } => isInstanceOf(MapType, data.subject),
      component: ({ data, role }) => {
        const state = useCapability(MapCapabilities.MutableState);
        const [lng = 0, lat = 0] = data.subject?.coordinates ?? [];
        const [center, setCenter] = useState<LatLngLiteral>({ lat, lng });
        const [zoom, setZoom] = useState(14);

        const handleChange = useCallback(({ center, zoom }: { center: LatLngLiteral; zoom: number }) => {
          setCenter(center);
          setZoom(zoom);
        }, []);

        return (
          <MapContainer
            role={role}
            type={state.type}
            map={data.subject}
            center={center}
            zoom={zoom}
            onChange={handleChange}
          />
        );
      },
    }),
    createSurface({
      id: 'plugin-map',
      role: 'canvas-node',
      filter: (data) => isInstanceOf(MapType, data),
      component: ({ data }) => {
        const [lng = 0, lat = 0] = data?.coordinates ?? [];
        return <MapControl center={{ lat, lng }} zoom={14} />;
      },
    }),
    createSurface({
      id: `${MAP_PLUGIN}/settings`,
      role: 'complementary--settings',
      filter: (data): data is { subject: MapType } => isInstanceOf(MapType, data.subject),
      component: ({ data }) => <MapViewEditor map={data.subject} />,
    }),
    createSurface({
      id: `${MAP_PLUGIN}/create-initial-schema-form-[schema]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: S.Schema<any>; target: Space | CollectionType | undefined } => {
        const annotation = findAnnotation<boolean>((data.schema as S.Schema.All).ast, InitialSchemaAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        if (!space) {
          return null;
        }
        const schemata = space?.db.schemaRegistry.query().runSync();

        return <SelectInput {...props} options={schemata.map((schema) => ({ value: schema.typename }))} />;
      },
    }),
    createSurface({
      id: `${MAP_PLUGIN}/create-initial-schema-form-[property-of-interest]`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: S.Schema<any>; target: Space | CollectionType | undefined } => {
        const annotation = findAnnotation<boolean>((data.schema as S.Schema.All).ast, LocationPropertyAnnotationId);
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
