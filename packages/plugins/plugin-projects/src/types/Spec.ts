//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Project from '@dxos/compute/Project';
import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { SpecDocument } from '@dxos/types';

import * as Feature from './Feature.ts';

/** Where a feature's card sits on its spec's canvas. */
export const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Position = Schema.Schema.Type<typeof Position>;

/** How the spec's canvas is arranged; a feature without a position is laid out automatically. */
export const Layout = Schema.Struct({
  /** Where the user dragged each card, by feature id. */
  positions: Schema.Record(Schema.String, Position),
});
export type Layout = Schema.Schema.Type<typeof Layout>;

/**
 * A feature map: the features a product area should reach, laid out on a canvas. A spec nests by a feature owning a
 * spec of its own, which breaks that feature down. It may name the project whose tasks deliver it, and hold the
 * normative `.mdl` document its features were extracted from.
 */
export class Spec extends Type.makeObject<Spec>(DXN.make('org.dxos.type.projects.spec', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),

    description: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
        Schema.annotate({
          title: 'Description',
          description: 'What the product area does when its features are complete.',
        }),
      ),
    ),

    /** Owned: a feature belongs to exactly one spec, and deleting the spec deletes its features. */
    features: Schema.Array(Schema.suspend((): Ref.RefSchema<Feature.Feature> => Ref.Ref(Feature.Feature))).pipe(
      Annotation.SetParent.set(),
      Annotation.FormInputAnnotation.set(false),
    ),

    layout: Schema.optional(Layout.pipe(Annotation.FormInputAnnotation.set(false))),

    /** The project whose tasks deliver the spec's features; not owned, so deleting the project keeps the spec. */
    project: Schema.optional(Ref.Ref(Project.Project).pipe(Schema.annotate({ title: 'Project' }))),

    /** The normative text the features were extracted from; owned, since a document lives only within its spec. */
    document: Schema.optional(
      Ref.Ref(SpecDocument.SpecDocument).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--blueprint--regular', hue: 'violet' }),
    Annotation.UserType.set(),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Spec>, 'features'> &
  Partial<Pick<Obj.MakeProps<typeof Spec>, 'features'>>;

/** `features` starts as an empty list so two peers lazily creating it cannot each write a fresh one. */
export const make = (props: MakeProps): Spec => Obj.make(Spec, { features: [], ...props });

export const instanceOf = (value: unknown): value is Spec => Obj.instanceOf(Spec, value);

/** The spec whose map lists the feature: its ECHO parent. */
export const getContainer = (feature: Feature.Feature): Spec | undefined => {
  const parent = Obj.getParent(feature);
  return instanceOf(parent) ? parent : undefined;
};

/** The feature the spec breaks down: its ECHO parent; undefined for a top-level spec. */
export const getOwner = (spec: Spec): Feature.Feature | undefined => {
  const parent = Obj.getParent(spec);
  return Feature.instanceOf(parent) ? parent : undefined;
};

/**
 * The specs from `spec` up to the top-level one, each the container of the feature that owns the one before it. Stops
 * at a spec already seen, so a cycle written by a concurrent move cannot loop.
 */
export const getAncestry = (spec: Spec | undefined): Spec[] => {
  const chain: Spec[] = [];
  const seen = new Set<string>();
  for (let current = spec; current && !seen.has(current.id);) {
    seen.add(current.id);
    chain.push(current);
    const owner = getOwner(current);
    current = owner && getContainer(owner);
  }
  return chain;
};

/** Whether `spec` is the breakdown of `feature` or lies anywhere beneath it. */
export const isWithin = (spec: Spec, feature: Feature.Feature): boolean =>
  getAncestry(spec).some((current) => getOwner(current)?.id === feature.id);

/** The project that tracks the feature's work: its spec's, else the nearest one up the chain of specs. */
export const findProject = (feature: Feature.Feature): Ref.Ref<Project.Project> | undefined =>
  getAncestry(getContainer(feature)).find((spec) => spec.project)?.project;
