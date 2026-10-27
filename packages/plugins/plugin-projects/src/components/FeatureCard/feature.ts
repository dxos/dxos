//
// Copyright 2026 DXOS.org
//

import { type Feature } from '#types';

/**
 * View model for feature cards (`agents/superpowers/specs/2026-10-17-feature-map-ontology.md`).
 * Plain data so cards render the same from live objects ({@link buildFeatureModels}) and from stories.
 */

export type FeatureStatus = Feature.Status;

export type FeatureTask = {
  id: string;
  title: string;
  done: boolean;
  /** Someone is working on it now (started or in review); what makes the feature active. */
  active: boolean;
  milestone?: string;
};

export type FeatureRef = {
  id: string;
  name: string;
};

/** A subfeature as its parent's card lists it. */
export type FeatureChild = FeatureRef & { status: FeatureStatus };

export type FeatureModel = {
  id: string;
  name: string;
  description?: string;
  status: FeatureStatus;
  /**
   * Someone is working on the feature: a linked task is started or in review. A second axis beside `status`, so an
   * operational feature can be under work as well as a planned one.
   */
  active: boolean;
  requirements: readonly Feature.Requirement[];
  /** The spec blocks the requirements were extracted from. */
  specs: readonly string[];
  /** Ids of the specs imported into the space, by repo path without anchor; such a spec opens in place of GitHub. */
  specObjects?: Readonly<Record<string, string>>;
  /** Id of the spec whose map lists the feature. */
  spec?: string;
  /** Id of the feature this one breaks down: the owner of its spec. */
  parent?: string;
  /** The features of the spec that breaks this one down, by name. */
  subfeatures: readonly FeatureChild[];
  /** The features it needs that sit on another spec's map; set by a view of one map, which draws no arrow to them. */
  external?: readonly FeatureRef[];
  /** The DXN code cites the feature by (`Feature.getLink`); absent without a `meta.key`. */
  link?: string;
  /** The code that cites the feature with a `@feature` tag. */
  code: readonly Feature.CodeLink[];
  /** Ids of the features this one needs (`DependsOn` targets). */
  dependsOn: readonly string[];
  /** Tasks with an `Implements` relation to this feature. */
  tasks: readonly FeatureTask[];
  /** Showcases that demonstrate this feature; the card leads with the first. */
  showcases: readonly FeatureRef[];
};

/** The fields a view changes directly: a Kanban drop sets the status. */
export type FeatureChanges = Partial<Pick<FeatureModel, 'name' | 'description' | 'status'>>;

/** Something a card links to: an object of the space (the feature, a dependency, a task, a showcase) or a spec path. */
export type FeatureTarget =
  | { type: 'object'; id: string }
  /** `id` is the space's imported copy of the spec, when there is one. */
  | { type: 'spec'; path: string; id?: string };

/** A derived warning; never stored. */
export type FeatureSignal = 'blocked' | 'ahead' | 'no-evidence' | 'unplanned';

/** How a card relates to the selected feature. */
export type FeatureRelation = 'dependency' | 'dependent';

export type FeatureLookup = (id: string) => FeatureModel | undefined;

/** Builds a lookup by id. */
export const makeFeatureLookup = (features: readonly FeatureModel[]): FeatureLookup => {
  const byId = new Map(features.map((feature) => [feature.id, feature]));
  return (id) => byId.get(id);
};

/** Signals in display order: problems first, then status. Dependencies outside the lookup are ignored. */
export const getFeatureSignals = (feature: FeatureModel, lookup: FeatureLookup): FeatureSignal[] => {
  const dependencies = feature.dependsOn.flatMap((id) => lookup(id) ?? []);
  const signals: FeatureSignal[] = [];
  if (dependencies.some((dependency) => dependency.status === 'planned' || dependency.status === 'failing')) {
    signals.push('blocked');
  }
  if (feature.status === 'operational' && dependencies.some((dependency) => dependency.status !== 'operational')) {
    signals.push('ahead');
  }
  if (feature.status === 'operational' && feature.showcases.length === 0) {
    signals.push('no-evidence');
  }
  if (feature.status === 'planned' && feature.tasks.length === 0) {
    signals.push('unplanned');
  }
  return signals;
};

/** Ids of the features that list `id` in their `dependsOn` (the reverse lookup the model does not store). */
export const getDependents = (id: string, features: readonly FeatureModel[]): string[] =>
  features.filter((feature) => feature.dependsOn.includes(id)).map((feature) => feature.id);

/** Relation of `feature` to the selected one, if any. */
export const getFeatureRelation = (
  feature: FeatureModel,
  selected: FeatureModel | undefined,
): FeatureRelation | undefined => {
  if (!selected || selected.id === feature.id) {
    return undefined;
  }
  if (selected.dependsOn.includes(feature.id)) {
    return 'dependency';
  }
  if (feature.dependsOn.includes(selected.id)) {
    return 'dependent';
  }
  return undefined;
};

//
// From ECHO.
//

export type FeatureGraphInput = {
  features: readonly {
    id: string;
    name: string;
    description?: string;
    status: FeatureStatus;
    requirements?: readonly Feature.Requirement[];
    specs?: readonly string[];
    spec?: string;
    parent?: string;
    link?: string;
    code?: readonly Feature.CodeLink[];
  }[];
  /** The subfeatures of the features above, by parent id; the scope's own members need not be among them. */
  children?: readonly (readonly [FeatureChild, string])[];
  /** `DependsOn` edges as `[source, target]` feature ids. */
  dependsOn: readonly (readonly [string, string])[];
  /** `Implements` edges as `[task, featureId]`. */
  implementedBy: readonly (readonly [FeatureTask, string])[];
  /** `Demonstrates` edges as `[showcase, targetId]`. */
  showcasedBy: readonly (readonly [FeatureRef, string])[];
  /** Imported spec ids by repo path. */
  specObjects?: Readonly<Record<string, string>>;
};

/** Joins features with their relations into card models, keeping the order of `features`. */
export const buildFeatureModels = ({
  features,
  children = [],
  dependsOn,
  implementedBy,
  showcasedBy,
  specObjects,
}: FeatureGraphInput): FeatureModel[] => {
  const group = <T>(pairs: readonly (readonly [T, string])[], key: (pair: readonly [T, string]) => string) => {
    const map = new Map<string, T[]>();
    for (const pair of pairs) {
      map.set(key(pair), [...(map.get(key(pair)) ?? []), pair[0]]);
    }
    return map;
  };
  const dependencies = new Map<string, string[]>();
  for (const [source, target] of dependsOn) {
    dependencies.set(source, [...(dependencies.get(source) ?? []), target]);
  }
  const tasks = group(implementedBy, ([, featureId]) => featureId);
  const showcases = group(showcasedBy, ([, targetId]) => targetId);
  const subfeatures = group(children, ([, parentId]) => parentId);
  return features.map((feature) => ({
    ...feature,
    active: (tasks.get(feature.id) ?? []).some((task) => task.active),
    requirements: feature.requirements ?? [],
    subfeatures: (subfeatures.get(feature.id) ?? []).sort((left, right) => left.name.localeCompare(right.name)),
    specs: feature.specs ?? [],
    code: feature.code ?? [],
    specObjects,
    dependsOn: dependencies.get(feature.id) ?? [],
    tasks: tasks.get(feature.id) ?? [],
    showcases: showcases.get(feature.id) ?? [],
  }));
};
