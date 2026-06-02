//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useMemo, useState } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Database, JsonSchema, Obj, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import { type LatLngLiteral } from '@dxos/react-ui-geo';
import { type APIKey } from '@dxos/schema';

import { MapArticle, MapViewEditor } from '#containers';
import { LocationAnnotationId, Map, MapCapabilities } from '#types';

// MapTiler raster style used when an API key for `maptiler.com` is configured.
const MAPTILER_STYLE = 'streets-v2';

/** Build a MapTiler tile URL when a `maptiler.com` API key is configured; otherwise undefined (default OSM). */
const buildTileUrl = (apiKeys?: readonly APIKey[]): string | undefined => {
  const key = apiKeys?.find((entry) => entry.domain === 'maptiler.com');
  return key?.apiKey ? `https://api.maptiler.com/maps/${MAPTILER_STYLE}/{z}/{x}/{y}.png?key=${key.apiKey}` : undefined;
};

/**
 * Resolves the marker provider, tile URL and selection writer for {@link MapArticle} and wires the
 * shared map view state (globe/map type, last center/zoom). Used by the map article/section, the
 * generic `map` inline role, and the map companion.
 */
const MapSurface = ({ subject, attendableId, role }: { subject: Obj.Any; attendableId?: string; role?: string }) => {
  const providers = useCapabilities(MapCapabilities.MarkerProvider);
  const provider = useMemo(() => providers.find((entry) => entry.match(subject)), [providers, subject]);
  const settings = useAtomCapability(MapCapabilities.Settings);
  const tileUrl = useMemo(() => buildTileUrl(settings?.apiKeys), [settings?.apiKeys]);
  const state = useAtomCapability(MapCapabilities.State);
  const { invokePromise } = useOperationInvoker();

  const [center, setCenter] = useState<LatLngLiteral | undefined>(undefined);
  const [zoom, setZoom] = useState<number | undefined>(undefined);
  const handleChange = useCallback(({ center, zoom }: { center: LatLngLiteral; zoom: number }) => {
    setCenter(center);
    setZoom(zoom);
  }, []);

  const handleSelect = useCallback(
    (contextId: string, mode: 'single' | 'multi', id: string) => {
      const subject = mode === 'multi' ? { mode: 'multi' as const, ids: [id] } : { mode: 'single' as const, id };
      void invokePromise(LayoutOperation.Select, { contextId, subject });
    },
    [invokePromise],
  );

  return (
    <MapArticle
      role={role}
      subject={subject}
      attendableId={attendableId}
      provider={provider}
      tileUrl={tileUrl}
      type={state.type}
      center={center}
      zoom={zoom}
      onChange={handleChange}
      onSelect={handleSelect}
    />
  );
};

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
