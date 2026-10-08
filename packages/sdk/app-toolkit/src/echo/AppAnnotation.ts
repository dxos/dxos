//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Collection, type Database, Obj, Ref } from '@dxos/echo';

// The module, not the barrel: the barrel pulls in `AppNode`, which imports this file back, and the
// annotation below reads the schema at module-init time.
import * as AppSettings from '../types/AppSettings.ts';
/** Root navigation collection for a space. */
export const RootCollectionAnnotation = Annotation.make({
  id: 'org.dxos.space.rootCollection',
  schema: Ref.Ref(Collection.Collection),
});

/** Adds a space's root collection as a `system` write: it is scaffolding, never a person's action. */
export const addRootCollection = (db: Database.Database): Collection.Collection =>
  db.add(Collection.make(), { origin: 'system' });

/** The settings space's settings object. */
export const AppSettingsAnnotation = Annotation.make({
  id: 'org.dxos.space.appSettings',
  schema: Ref.Ref(AppSettings.AppSettings),
});

/**
 * Id of the {@link AppCapabilities.SpaceTemplate} a space was created from, recorded on its
 * `properties`.
 */
export const SpaceTemplateAnnotation = Annotation.make({
  id: 'org.dxos.space.spaceTemplate',
  schema: Schema.String,
});

/**
 * Id of the space the user has designated as their default space. Stored on the settings space's
 * `properties` so the choice replicates across devices and can be repointed at any space.
 */
export const DefaultSpaceAnnotation = Annotation.make({
  id: 'org.dxos.space.defaultSpace',
  schema: Schema.String,
});

/** Graph node properties derived from schema (e.g. autofocus behavior). */
export const GraphPropsAnnotation = Annotation.make<{ managesAutofocus?: boolean }>({
  id: 'org.dxos.annotation.graph-props',
  schema: Schema.Struct({ managesAutofocus: Schema.optional(Schema.Boolean) }),
});

/** Per-type object ordering stored on space.properties, keyed by typename. */
export const SectionOrderAnnotation = Annotation.make({
  id: 'org.dxos.space.sectionOrder',
  schema: Schema.Record(Schema.String, Schema.Array(Ref.Ref(Obj.Unknown))),
});

/**
 * Per-space visibility of Home content sections, keyed by contributor name. Stored on
 * `space.properties` so it replicates across the user's devices. An absent/`undefined` entry
 * means the section is visible (default on); `false` hides it.
 */
export const HomeVisibilityAnnotation = Annotation.make({
  id: 'org.dxos.space.homeVisibility',
  schema: Schema.Record(Schema.String, Schema.Boolean),
});
