//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type GeoMarker, type LatLngLiteral } from '@dxos/react-ui-geo';

import { type MapControlType } from '#containers';
import { meta } from '#meta';

import { type Settings as SettingsType } from './Settings';

const LatLngLiteralSchema = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number,
});

export const StateSchema = Schema.mutable(
  Schema.Struct({
    type: Schema.Literal('globe', 'map'),
    center: Schema.optional(LatLngLiteralSchema),
    zoom: Schema.optional(Schema.Number),
  }),
);

export type State = {
  type: MapControlType;
  center?: LatLngLiteral;
  zoom?: number;
};

export const State = Capability.make<Atom.Writable<State>>(`${meta.id}.capability.state`);

/** Writable settings atom (also surfaced as a settings form via `AppCapabilities.Settings`). */
export const Settings = Capability.make<Atom.Writable<SettingsType>>(`${meta.id}.capability.settings`);

//
// Marker providers
//

/** Origin → destination arc (rendered on the globe). `color` is an optional stroke color. */
export type GeoLine = { source: LatLngLiteral; target: LatLngLiteral; color?: string };

/** Reactive marker data resolved for a subject by a {@link MarkerProvider}. */
export type MarkerSet = {
  /** One marker per plottable point; `id` is the selectable entity id. */
  markers: GeoMarker[];
  /** Optional great-circle arcs between points (globe only). */
  lines?: GeoLine[];
  /** Attention selection wiring. Defaults to the article's `attendableId` in single mode. */
  selection?: { contextId?: string; mode?: 'single' | 'multi' };
};

/**
 * Contributed by any plugin that can plot a subject on the map. `MapArticle`
 * (and the map companion) resolve the first provider whose `match` accepts the
 * subject, then render its reactive `useMarkers` result.
 */
export type MarkerProvider = {
  /** Stable id (used as a React remount key when the active provider changes). */
  id: string;
  /** Synchronous, type-based predicate. Must not call hooks. */
  match: (subject: unknown) => boolean;
  /** Reactive hook returning the markers for a subject this provider matches. */
  useMarkers: (subject: any, options: { attendableId?: string }) => MarkerSet;
};

export const MarkerProvider = Capability.make<MarkerProvider>(`${meta.id}.capability.markerProvider`);
