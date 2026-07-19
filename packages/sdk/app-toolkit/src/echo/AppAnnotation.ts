//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Collection, Obj, Ref } from '@dxos/echo';
/** Root navigation collection for a space. */
export const RootCollectionAnnotation = Annotation.make({
  id: 'org.dxos.space.rootCollection',
  schema: Ref.Ref(Collection.Collection),
});

/** Skill keys associated with a schema type. Used by AI companion to auto-load skills. */
export const SkillsAnnotation = Annotation.make<string[]>({
  id: 'org.dxos.annotation.skills',
  schema: Schema.mutable(Schema.Array(Schema.String)),
});

/**
 * Registered URL prefix key for a type's `TypeSection` graph-builder extension (e.g. `doc`, `mail`).
 * Read by `createTypeSectionExtension` to fill in `urlKey` automatically; falls back to the
 * lowercased last segment of the typename when absent. See `@dxos/app-graph`'s `path-resolution.ts`
 * for how registered keys are used to resolve and serialize URLs.
 */
export const UrlPrefixAnnotation = Annotation.make<string>({
  id: 'org.dxos.annotation.url-prefix',
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
  schema: Schema.Record({ key: Schema.String, value: Schema.Array(Ref.Ref(Obj.Unknown)) }),
});

/**
 * Per-space visibility of Home content sections, keyed by contributor name. Stored on
 * `space.properties` so it replicates across the user's devices. An absent/`undefined` entry
 * means the section is visible (default on); `false` hides it.
 */
export const HomeVisibilityAnnotation = Annotation.make({
  id: 'org.dxos.space.homeVisibility',
  schema: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
});
