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
