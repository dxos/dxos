//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Database, JsonSchema, Obj } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import { type LatLngLiteral } from '@dxos/react-ui-geo';
import { type Collection } from '@dxos/schema';

import { MapContainer, MapViewEditor } from '../../components';
import { meta } from '../../meta';
import { LocationAnnotationId, Map, MapCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
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
              object={data.subject}
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
      Common.createSurface({
        id: `${meta.id}/surface/object-settings`,
        role: 'object-settings',
        position: 'hoist',
        filter: (data): data is { subject: Map.Map } => Obj.instanceOf(Map.Map, data.subject),
        component: ({ data }) => <MapViewEditor object={data.subject} />,
      }),
      Common.createSurface({
        // TODO(burdon): Why this title?
        id: `${meta.id}/surface/create-initial-schema-form-[property-of-interest]`,
        role: 'form-input',
        filter: (
          data,
        ): data is {
          prop: string;
          schema: Schema.Schema<any>;
          target: Database.Database | Collection.Collection | undefined;
        } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, LocationAnnotationId);
          return !!annotation;
        },
        component: ({ data: { target }, ...inputProps }) => {
          const props = inputProps as any as FormFieldComponentProps;
          const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
          const { typename } = useFormValues('MapForm');

          const [schema] = db?.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).runSync() ?? [];
          const jsonSchema = schema && JsonSchema.toJsonSchema(schema);

          const coordinateProperties = useMemo(() => {
            if (!jsonSchema?.properties) {
              return [];
            }

            // Look for properties that use the LatLng format enum
            const properties = Object.entries(jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
              if (typeof value === 'object' && value?.format === Format.TypeFormat.GeoPoint) {
                acc.push(key);
              }
              return acc;
            }, []);

            return properties;
          }, [jsonSchema]);

          if (!typename) {
            return null;
          }

          return (
            <SelectField
              {...props}
              options={coordinateProperties.map((property) => ({
                value: property,
              }))}
            />
          );
        },
      }),
    ]),
  ),
);
