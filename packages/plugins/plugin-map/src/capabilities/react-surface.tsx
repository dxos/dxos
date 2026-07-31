//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Database, JsonSchema, Obj, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { SchemaEx } from '@dxos/effect';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import { Position } from '@dxos/util';

import { MapSurface, MapViewEditor } from '#containers';
import { LocationAnnotationId, Map, MapInline } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'surface.map',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Map.Map),
          AppSurface.object(AppSurface.Section, Map.Map),
        ),
        component: ({ data, role }) => (
          <MapSurface subject={data.subject} attendableId={data.attendableId} role={role} />
        ),
      }),
      // Generic inline map for any subject a MarkerProvider matches; requested explicitly by
      // role (e.g. TripArticle renders `<Surface.Surface type={MapInline} data={{ subject, attendableId }} />`).
      Surface.create({
        id: 'surface.mapInline',
        filter: AppSurface.subject(MapInline, Obj.isObject),
        component: ({ data, role }) => (
          <MapSurface subject={data.subject} attendableId={data.attendableId} role={role} />
        ),
      }),
      // Companion surface for any object that has markers (gated by app-graph-builder, which only
      // emits the `map` companion node when a MarkerProvider matches the primary object).
      Surface.create({
        id: 'surface.mapCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'map'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data, role }) => (
          <MapSurface subject={data.companionTo} attendableId={data.attendableId} role={role} />
        ),
      }),
      Surface.create({
        id: 'surface.objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, Map.Map),
        component: ({ data }) => <MapViewEditor object={data.subject} />,
      }),
      Surface.create({
        // TODO(burdon): Why this title?
        id: 'surface.createInitialSchemaForm',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, LocationAnnotationId)),
        component: ({ data, ...inputProps }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const props = { ...inputProps, type: ast } as any as FormFieldRendererProps;
          const target = data.target;
          const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
          const { typename } = useFormValues('MapForm');

          const schema =
            typename && db
              ? db.graph.registry
                  .list()
                  .filter(Type.isType)
                  .find((t) => Type.getTypename(t) === typename)
              : undefined;
          const jsonSchema = schema && JsonSchema.toJsonSchema(schema);

          const coordinateProperties = useMemo(() => {
            if (!jsonSchema?.properties) {
              return [];
            }

            // Look for properties that use the LatLng format enum
            const properties = Object.entries(jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
              if (
                typeof value === 'object' &&
                value !== null &&
                'format' in value &&
                value.format === Format.TypeFormat.GeoPoint
              ) {
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
