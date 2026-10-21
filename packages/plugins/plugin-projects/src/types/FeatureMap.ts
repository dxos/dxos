//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';

import * as Feature from './Feature.ts';

export const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Position = Schema.Schema.Type<typeof Position>;

/**
 * A board of features. Membership is explicit so a map can be scoped to one plugin, product or release;
 * a feature can be on several maps.
 */
export class FeatureMap extends Type.makeObject<FeatureMap>(DXN.make('org.dxos.type.featureMap', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Name' }))),

    /** Members, in card order. Not owned: deleting a map leaves its features. */
    features: Schema.Array(Ref.Ref(Feature.Feature)).pipe(Annotation.FormInputAnnotation.set(false)),

    /** Canvas positions the user dragged, by feature id; features without one are auto-laid out. */
    positions: Schema.mutableKey(Schema.Record(Schema.String, Position)).pipe(
      Annotation.FormInputAnnotation.set(false),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'violet' }),
    // See `Feature`: the feature operations live in the project skill.
    Skill.SkillsAnnotation.set(['org.dxos.skill.project']),
    Annotation.UserType.set(),
  ),
) {}

export const make = (props: Partial<Obj.MakeProps<typeof FeatureMap>> = {}): FeatureMap =>
  Obj.make(FeatureMap, { features: [], positions: {}, ...props });

export const instanceOf = (value: unknown): value is FeatureMap => Obj.instanceOf(FeatureMap, value);
