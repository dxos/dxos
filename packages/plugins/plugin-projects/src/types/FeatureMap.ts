//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, type Entity, Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import * as Feature from './Feature.ts';
import * as FeatureEmbed from './FeatureEmbed.ts';

/**
 * A spec's feature map: the features its text embeds, held as an annotation on the spec so the spec type stays free of
 * them. A feature belongs to one spec (its ECHO parent), and nests by owning a spec of its own that breaks it down.
 */

/** The dialect whose `feat` blocks a feature map's features are; a spec uses it to be drawn as a map. */
export const DIALECT = 'org.dxos.spec.features';

/** Whether the spec uses the features dialect, which its map views, its feature embeds and `/feature` need. */
export const usesDialect = (spec: Pick<Spec.Spec, 'dialects'>): boolean => spec.dialects.includes(DIALECT);

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
 * The features the spec holds, in its text's order. The refs make the spec each feature's owner, so deleting the spec
 * deletes them; only the sync and the feature operations write it.
 */
export const FeaturesAnnotation = Annotation.make({
  id: 'org.dxos.projects.features',
  schema: Schema.Array(Ref.Ref(Feature.Feature)),
});

/** Where the canvas places the spec's features. */
export const LayoutAnnotation = Annotation.make({ id: 'org.dxos.projects.layout', schema: Layout });

/** The refs to the features the spec holds. */
export const getFeatures = (spec: Spec.Spec | Entity.Snapshot): readonly Ref.Ref<Feature.Feature>[] =>
  Annotation.get(spec, FeaturesAnnotation).pipe(Option.getOrElse(() => []));

/** Where the canvas places the spec's features, if the user has dragged any. */
export const getLayout = (spec: Spec.Spec | Entity.Snapshot): Layout | undefined =>
  Annotation.get(spec, LayoutAnnotation).pipe(Option.getOrUndefined);

/** Turns the features dialect on for a spec about to hold features. */
const addDialect = (spec: Spec.Spec): void => {
  if (!usesDialect(spec)) {
    Obj.update(spec, (spec) => {
      spec.dialects.push(DIALECT);
    });
  }
};

/** Adds the feature to the end of the spec's features, or at `index`, and makes the spec its owner. */
export const attach = (spec: Spec.Spec, feature: Feature.Feature, index?: number): void => {
  addDialect(spec);
  const ref = Ref.make(feature);
  if (Option.isNone(Annotation.get(spec, FeaturesAnnotation))) {
    Obj.update(spec, (spec) => {
      Annotation.set(spec, FeaturesAnnotation, [ref]);
    });
  } else {
    // Spliced in place, so two peers adding features each keep theirs.
    Annotation.update(spec, FeaturesAnnotation, (features) => {
      features.splice(index ?? features.length, 0, ref);
    });
  }
  if (Obj.getParent(feature)?.id !== spec.id) {
    Obj.setParent(feature, spec);
  }
};

/** Takes the feature out of the spec's features and its canvas, leaving its ownership to whoever takes it next. */
export const detach = (spec: Spec.Spec, id: string): void => {
  const index = getFeatures(spec).findIndex((ref) => FeatureEmbed.entityId(ref.uri) === id);
  if (index !== -1) {
    Annotation.update(spec, FeaturesAnnotation, (features) => {
      features.splice(index, 1);
    });
  }
  if (getLayout(spec)?.positions[id]) {
    Annotation.update(spec, LayoutAnnotation, (layout) => {
      delete layout.positions[id];
    });
  }
};

/** Makes the spec's features exactly `features`, in that order, owning each. */
export const setFeatures = (spec: Spec.Spec, features: readonly Feature.Feature[]): void => {
  const current = getFeatures(spec).map((ref) => FeatureEmbed.entityId(ref.uri));
  if (current.length === features.length && features.every((feature, index) => feature.id === current[index])) {
    return;
  }
  if (features.length > 0) {
    addDialect(spec);
  }
  const refs = features.map((feature) => Ref.make(feature));
  if (Option.isNone(Annotation.get(spec, FeaturesAnnotation))) {
    Obj.update(spec, (spec) => {
      Annotation.set(spec, FeaturesAnnotation, refs);
    });
  } else {
    Annotation.update(spec, FeaturesAnnotation, (list) => {
      list.splice(0, list.length, ...refs);
    });
  }
  for (const feature of features) {
    if (Obj.getParent(feature)?.id !== spec.id) {
      Obj.setParent(feature, spec);
    }
  }
};

/** Records where the user dropped a feature's card. */
export const setPosition = (spec: Spec.Spec, id: string, position: Position): void => {
  if (getLayout(spec)) {
    Annotation.update(spec, LayoutAnnotation, (layout) => {
      layout.positions[id] = position;
    });
  } else {
    Obj.update(spec, (spec) => {
      Annotation.set(spec, LayoutAnnotation, { positions: { [id]: position } });
    });
  }
};

export type MakeProps = Omit<Spec.MakeProps, 'content'> & {
  /** The features the spec holds; its text embeds each under `## Features`. */
  features?: readonly Feature.Feature[];
};

/** A spec in the features dialect holding `features`, its text headed with its name and embedding each of them. */
export const make = ({ features = [], dialects = [DIALECT], ...props }: MakeProps): Spec.Spec => {
  const spec = Spec.make({ ...props, dialects, content: makeContent(props.name, features) });
  if (features.length > 0) {
    setFeatures(spec, features);
  }
  return spec;
};

/** A spec's starting text: front matter naming it, then an embed of each feature, under `## Features`. */
export const makeContent = (name: string, features: readonly Feature.Feature[] = []): string => {
  const header = trim`
    ---
    name: ${name}
    ---
  `;
  const embeds = features.map((feature) => FeatureEmbed.make({ label: feature.name, uri: Obj.getURI(feature) }));
  return embeds.length > 0 ? `${header}\n\n## Features\n\n${embeds.join('\n\n')}\n` : header;
};

/** The spec whose map lists the feature: its ECHO parent. */
export const getContainer = (feature: Feature.Feature): Spec.Spec | undefined => {
  const parent = Obj.getParent(feature);
  return Spec.instanceOf(parent) ? parent : undefined;
};

/** The feature the spec breaks down: its ECHO parent; undefined for a top-level spec. */
export const getOwner = (spec: Spec.Spec): Feature.Feature | undefined => {
  const parent = Obj.getParent(spec);
  return Feature.instanceOf(parent) ? parent : undefined;
};

/**
 * The specs from `spec` up to the top-level one, each the container of the feature that owns the one before it. Stops
 * at a spec already seen, so a cycle written by a concurrent move cannot loop.
 */
export const getAncestry = (spec: Spec.Spec | undefined): Spec.Spec[] => {
  const chain: Spec.Spec[] = [];
  const seen = new Set<string>();
  for (let current = spec; current && !seen.has(current.id);) {
    seen.add(current.id);
    chain.push(current);
    const owner = getOwner(current);
    current = owner && getContainer(owner);
  }
  return chain;
};

/** The features from the top-level spec down to `feature`, each owning the spec the next one is on. */
export const getLineage = (feature: Feature.Feature): Feature.Feature[] => [
  ...getAncestry(getContainer(feature))
    .flatMap((spec) => getOwner(spec) ?? [])
    .reverse(),
  feature,
];

/** Whether `spec` is the breakdown of `feature` or lies anywhere beneath it. */
export const isWithin = (spec: Spec.Spec, feature: Feature.Feature): boolean =>
  getAncestry(spec).some((current) => getOwner(current)?.id === feature.id);

/** The top-level spec above the feature: the one a project owns, if any. */
export const findRoot = (feature: Feature.Feature): Spec.Spec | undefined => getAncestry(getContainer(feature)).at(-1);

/** The project that tracks the feature's work: the one owning the top-level spec above it. */
export const findProject = (feature: Feature.Feature): Project.Project | undefined => {
  const root = findRoot(feature);
  return root && Project.getOwner(root);
};
