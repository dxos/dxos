//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { FormatEnum } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { useClient } from '@dxos/react-client';
import { type Space, getSpace, isSpace } from '@dxos/react-client/echo';
import { type InputProps, SelectInput, useFormValues } from '@dxos/react-ui-form';
import { type LatLngLiteral } from '@dxos/react-ui-geo';
import { DataType } from '@dxos/schema';

import { MapContainer, MapViewEditor } from '../components';
import { meta } from '../meta';
import { LocationAnnotationId, Map } from '../types';

import { MapCapabilities } from './capabilities';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/surface/map`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Map.Map } => Obj.instanceOf(Map.Map, data.subject),
      component: ({ data, role }) => {
        const state = useCapability(MapCapabilities.MutableState);
        const [center, setCenter] = useState<LatLngLiteral | undefined>(undefined);
        const [zoom, setZoom] = useState<number | undefined>(undefined);

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
      id: `${meta.id}/surface/map-view`,
      role: ['article', 'section'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(Map.Map, data.subject.presentation.target),
      component: ({ data, role }) => {
        const state = useCapability(MapCapabilities.MutableState);
        const [center, setCenter] = useState<LatLngLiteral | undefined>(undefined);
        const [zoom, setZoom] = useState<number | undefined>(undefined);

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
    //     return <MapControl center={{ lat, lng }} zoom={8} />;
    //   },
    // }),
    createSurface({
      id: `${meta.id}/surface/object-settings`,
      role: 'object-settings',
      position: 'hoist',
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(Map.Map, data.subject.presentation.target),
      component: ({ data }) => <MapViewEditor view={data.subject} />,
    }),
    createSurface({
      // TODO(burdon): Why this title?
      id: `${meta.id}/surface/create-initial-schema-form-[property-of-interest]`,
      role: 'form-input',
      filter: (
        data,
      ): data is { prop: string; schema: Schema.Schema<any>; target: Space | DataType.Collection.Collection | undefined } => {
        const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, LocationAnnotationId);
        return !!annotation;
      },
      component: ({ data: { target }, ...inputProps }) => {
        const client = useClient();
        const props = inputProps as any as InputProps;
        const space = isSpace(target) ? target : getSpace(target);
        const { typename } = useFormValues();

        const staticSchema = client.graph.schemaRegistry.schemas.find(
          (schema) => Type.getTypename(schema) === typename,
        );
        const [dynamicSchema] = space?.db.schemaRegistry.query({ typename }).runSync() ?? [];
        const jsonSchema = staticSchema ? Type.toJsonSchema(staticSchema) : dynamicSchema?.jsonSchema;

        const coordinateProperties = useMemo(() => {
          if (!jsonSchema?.properties) {
            return [];
          }

          // Look for properties that use the LatLng format enum
          const properties = Object.entries(jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
            if (typeof value === 'object' && value?.format === FormatEnum.GeoPoint) {
              acc.push(key);
            }
            return acc;
          }, []);

          return properties;
        }, [jsonSchema]);

        if (!typename) {
          return null;
        }

        return <SelectInput {...props} options={coordinateProperties.map((property) => ({ value: property }))} />;
      },
    }),
  ]);
