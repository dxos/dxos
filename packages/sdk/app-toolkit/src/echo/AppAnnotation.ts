//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Collection, Obj, Ref } from '@dxos/echo';

// The module, not the barrel: the barrel pulls in `AppNode`, which imports this file back, and the
// annotation below reads the schema at module-init time.
import * as DeckSpec from '../app-graph/DeckSpec';
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
