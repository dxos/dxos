//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Relation, Type } from '@dxos/echo';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { Task } from '@dxos/types';

//
// Status
//

/** Where the feature is now; authored by whoever knows, never derived. */
export const Status = Schema.Literals(['planned', 'in-progress', 'prototype', 'operational', 'failing']);
export type Status = Schema.Schema.Type<typeof Status>;

export const StatusOptions: Task.Option<Status>[] = [
  { id: 'planned', title: 'Planned', color: 'neutral', icon: 'ph--circle-dashed--regular' },
  { id: 'in-progress', title: 'In progress', color: 'sky', icon: 'ph--circle-half--regular' },
  { id: 'prototype', title: 'Prototype', color: 'amber', icon: 'ph--flask--regular' },
  { id: 'operational', title: 'Operational', color: 'emerald', icon: 'ph--seal-check--regular' },
  { id: 'failing', title: 'Failing', color: 'rose', icon: 'ph--warning-octagon--regular' },
];

//
// Feature
//

/**
 * A goal state: something the product should do. Authored in ECHO; the repo specs that describe how
 * it is met stay in git and are referenced by path.
 */
export class Feature extends Type.makeObject<Feature>(DXN.make('org.dxos.type.feature', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),

    description: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
        Schema.annotate({ title: 'Description' }),
      ),
    ),

    status: Status.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      Schema.annotate({
        title: 'Status',
        [PropertyMetaAnnotationId]: { singleSelect: { options: StatusOptions } },
      }),
    ),

    /** Repo paths of the specs that describe this feature, e.g. `packages/plugins/plugin-inbox/PLUGIN.mdl#F-3`. */
    specs: Schema.optional(Schema.Array(Schema.String).pipe(Schema.annotate({ title: 'Specs' }))),

    /**
     * The parts this feature breaks down into, in display order. Owned, so `Filter.childOf(feature)`
     * finds them and deleting a feature deletes its subtree; claims only an unparented feature so a
     * stale entry cannot re-parent one on an unrelated write.
     */
    subfeatures: Schema.optional(
      Schema.Array(Schema.suspend((): Ref.RefSchema<Feature> => Ref.Ref(Feature))).pipe(
        Annotation.FormInputAnnotation.set(false),
        Annotation.SetParent.set({ override: false }),
        Schema.annotate({ title: 'Subfeatures' }),
      ),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--puzzle-piece--regular', hue: 'violet' }),
    Annotation.UserType.set(),
  ),
) {}

/** `subfeatures` starts as an empty list so two peers lazily creating it cannot each write a fresh one. */
export const make = (props: Obj.MakeProps<typeof Feature>): Feature => Obj.make(Feature, { subfeatures: [], ...props });

export const instanceOf = (value: unknown): value is Feature => Obj.instanceOf(Feature, value);

//
// Relations
//

/** Source does not work without target. Features form a DAG through this relation. */
export class DependsOn extends Type.makeRelation<DependsOn>(DXN.make('org.dxos.relation.dependsOn', '0.1.0'))({
  source: Feature,
  target: Feature,
})(Schema.Struct({ id: Obj.ID })) {}

export const makeDependsOn = (props: Relation.MakeProps<typeof DependsOn>) => Relation.make(DependsOn, props);

/** Source task is work toward the target feature; a task can move several features and a feature has many tasks. */
export class Implements extends Type.makeRelation<Implements>(DXN.make('org.dxos.relation.implements', '0.1.0'))({
  source: Task.Task,
  target: Feature,
})(Schema.Struct({ id: Obj.ID })) {}

export const makeImplements = (props: Relation.MakeProps<typeof Implements>) => Relation.make(Implements, props);
