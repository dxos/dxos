//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { Position } from '@dxos/util';

import { MapSurface, MapViewEditor } from '#containers';
import { Map } from '#types';

import { LocationAnnotationId } from '../types/MapCapabilities.ts';
import { MapInline } from '../types/MapRole.ts';
import { LocationField } from './LocationField.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'surface.map',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Map.Map),
          AppSurface.object(AppSurface.Section, Map.Map),
        ),
        component: MapSurface,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // Generic inline map for any subject a MarkerProvider matches; requested explicitly by
      // role (e.g. TripArticle renders `<Surface.Surface type={MapInline} data={{ subject, attendableId }} />`).
      Surface.create({
        id: 'surface.mapInline',
        filter: AppSurface.subject(MapInline, Obj.isObject),
        component: MapSurface,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // Companion surface for any object that has markers (gated by app-graph-builder, which only
      // emits the `map` companion node when a MarkerProvider matches the primary object).
      Surface.create({
        id: 'surface.mapCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'map'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: MapSurface,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, subject: companionTo, attendableId }),
      }),
      Surface.create({
        id: 'surface.objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, Map.Map),
        component: MapViewEditor,
        props: ({ data: { subject } }) => ({ object: subject }),
      }),
      Surface.create({
        // TODO(burdon): Why this title?
        id: 'surface.createInitialSchemaForm',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, LocationAnnotationId)),
        component: LocationField,
      }),
    ]),
  ),
);
