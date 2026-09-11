//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Collection, Obj, Ref } from '@dxos/echo';

// The module, not the barrel: the barrel pulls in `AppNode`, which imports this file back, and the
// annotation below reads the schema at module-init time.
import * as DeckSpec from '../app-graph/DeckSpec.ts';
import * as AppSettings from '../types/AppSettings.ts';
/** Root navigation collection for a space. */
export const RootCollectionAnnotation = Annotation.make({
  id: 'org.dxos.space.rootCollection',
  schema: Ref.Ref(Collection.Collection),
});

/**
 * The settings space's canonical {@link AppSettings.AppSettings}. Named on `properties` rather than
 * found by query, so two devices that both create one before replication converge on the same object
 * instead of each keeping its own.
 */
export const AppSettingsAnnotation = Annotation.make({
  id: 'org.dxos.space.appSettings',
  schema: Ref.Ref(AppSettings.AppSettings),
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

/**
 * How the deck should behave when an object of this type is its root — which planks it opens and what
 * chain of levels it supports. On the type rather than the node because the shape belongs to the type:
 * every Collection opens its children, every Mailbox has the same rungs.
 */
export const DeckAnnotation = Annotation.make<DeckSpec.DeckSpec>({
  id: 'org.dxos.annotation.deck',
  schema: DeckSpec.DeckSpec,
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
