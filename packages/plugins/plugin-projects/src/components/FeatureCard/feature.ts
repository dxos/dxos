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
  milestone?: string;
};

export type FeatureRef = {
  id: string;
  name: string;
};

export type FeatureModel = {
  id: string;
  name: string;
  description?: string;
  status: FeatureStatus;
  /** Repo paths of the specs that describe the feature. */
  specs: readonly string[];
  subfeatures: readonly Feature.Subfeature[];
  /** Ids of the features this one needs (`DependsOn` targets). */
  dependsOn: readonly string[];
  /** Tasks with an `Implements` relation to this feature. */
  tasks: readonly FeatureTask[];
  /** Showcases that demonstrate this feature; the card leads with the first. */
  showcases: readonly FeatureRef[];
};

/** A derived warning or status; never stored. */
export type FeatureSignal = 'blocked' | 'ahead' | 'no-evidence' | 'in-flight' | 'unplanned';

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
  if (feature.tasks.some((task) => !task.done)) {
    signals.push('in-flight');
  } else if (feature.status === 'planned' && feature.tasks.length === 0) {
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
    specs?: readonly string[];
    subfeatures: readonly Feature.Subfeature[];
  }[];
  /** `DependsOn` edges as `[source, target]` feature ids. */
  dependsOn: readonly (readonly [string, string])[];
  /** `Implements` edges as `[task, featureId]`. */
  implementedBy: readonly (readonly [FeatureTask, string])[];
  /** `Demonstrates` edges as `[showcase, targetId]`. */
  showcasedBy: readonly (readonly [FeatureRef, string])[];
};

/** Joins features with their relations into card models, keeping the order of `features`. */
export const buildFeatureModels = ({
  features,
  dependsOn,
  implementedBy,
  showcasedBy,
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
  return features.map((feature) => ({
    ...feature,
    specs: feature.specs ?? [],
    dependsOn: dependencies.get(feature.id) ?? [],
    tasks: tasks.get(feature.id) ?? [],
    showcases: showcases.get(feature.id) ?? [],
  }));
};
