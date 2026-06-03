//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Database, JsonSchema, Obj, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps, SelectField, useFormValues } from '@dxos/react-ui-form';

import { MapSurface, MapViewEditor } from '#containers';
import { LocationAnnotationId, Map } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
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
      // role (e.g. TripArticle renders `<Surface.Surface role='map' data={{ subject, attendableId }} />`).
      Surface.create({
        id: 'surface.mapInline',
        role: 'map',
        filter: (data): data is { subject: Obj.Any; attendableId?: string } => Obj.isObject(data.subject),
        component: ({ data, role }) => (
          <MapSurface subject={data.subject} attendableId={data.attendableId} role={role} />
        ),
      }),
      // Companion surface for any object that has markers (gated by app-graph-builder, which only
      // emits the `map` companion node when a MarkerProvider matches the primary object).
      Surface.create({
        id: 'surface.mapCompanion',
        role: 'article',
        filter: (data): data is { subject: 'map'; companionTo: Obj.Unknown; attendableId: string } =>
          Obj.isObject(data.companionTo) && (data as { subject?: unknown }).subject === 'map',
        component: ({ data, role }) => (
          <MapSurface subject={data.companionTo} attendableId={data.attendableId} role={role} />
        ),
      }),
      Surface.create({
        id: 'surface.objectProperties',
        position: 'first',
        filter: AppSurface.object(AppSurface.ObjectProperties, Map.Map),
        component: ({ data }) => <MapViewEditor object={data.subject} />,
      }),
      Surface.create({
        // TODO(burdon): Why this title?
        id: 'surface.createInitialSchemaForm',
        role: 'form-input',
        filter: (
          data,
        ): data is {
          prop: string;
          schema: Schema.Schema<any>;
          target: Database.Database | Collection.Collection | undefined;
          fieldPropertyAst?: SchemaAST.AST;
        } => {
          const annotation = findAnnotation<boolean>((data.schema as Schema.Schema.All).ast, LocationAnnotationId);
          return !!annotation;
        },
        component: ({ data: { target, fieldPropertyAst }, ...inputProps }) => {
          const ast = fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const props = { ...inputProps, type: ast } as any as FormFieldComponentProps;
          const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
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
