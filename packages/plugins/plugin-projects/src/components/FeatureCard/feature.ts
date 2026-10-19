//
// Copyright 2026 DXOS.org
//

/**
 * View model for the feature-map prototype (`agents/superpowers/specs/2026-10-17-feature-map-ontology.md`).
 * Plain data rather than ECHO objects: the `Feature` type is still a proposal, and the stories need
 * to show the UX before the schema lands.
 */

export type FeatureStage = 'planned' | 'preview' | 'stable';

export type FeatureRequirement = {
  /** Requirement key within the feature, e.g. `F-3.1`. */
  key: string;
  text: string;
  /** Some `test … covers:` names this requirement. */
  covered: boolean;
};

export type FeatureTask = {
  id: string;
  title: string;
  done: boolean;
  milestone?: string;
};

export type FeatureModel = {
  /** Global id: `<spec.key>#<key>`. */
  id: string;
  specKey: string;
  specName: string;
  /** Block id within the spec, e.g. `F-3`. */
  key: string;
  name: string;
  description?: string;
  stage: FeatureStage;
  /** Global ids of the features this one needs. */
  dependsOn: string[];
  requirements: FeatureRequirement[];
  /** Tasks with an `Implements` relation to this feature. */
  tasks: FeatureTask[];
};

/** A derived warning or status; never stored. */
export type FeatureSignal = 'in-flight' | 'blocked' | 'overclaimed' | 'missing-dependency' | 'untested' | 'unplanned';

/** How a card relates to the selected feature on the map. */
export type FeatureRelation = 'dependency' | 'dependent';

export type FeatureLookup = (id: string) => FeatureModel | undefined;

const STAGE_RANK: Record<FeatureStage, number> = { planned: 0, preview: 1, stable: 2 };

/**
 * Short form of a global id for when the feature cannot be resolved: the last segment of the spec key
 * (`agent` for `org.dxos.plugin.agent`) and the block key, so a missing dependency stays readable when truncated.
 */
export const getFeatureIdParts = (id: string): { spec: string; key: string } => {
  const [specKey, key = ''] = id.split('#');
  return { spec: specKey.split('.').at(-1) ?? specKey, key };
};

/** Builds a lookup by global id. */
export const makeFeatureLookup = (features: readonly FeatureModel[]): FeatureLookup => {
  const byId = new Map(features.map((feature) => [feature.id, feature]));
  return (id) => byId.get(id);
};

/** Signals in display order: problems first, then status. */
export const getFeatureSignals = (feature: FeatureModel, lookup: FeatureLookup): FeatureSignal[] => {
  const dependencies = feature.dependsOn.map((id) => lookup(id));
  const resolved = dependencies.filter((dependency) => dependency !== undefined);
  const signals: FeatureSignal[] = [];
  if (resolved.length < dependencies.length) {
    signals.push('missing-dependency');
  }
  if (resolved.some((dependency) => dependency.stage === 'planned')) {
    signals.push('blocked');
  }
  if (resolved.some((dependency) => STAGE_RANK[dependency.stage] < STAGE_RANK[feature.stage])) {
    signals.push('overclaimed');
  }
  if (feature.stage === 'stable' && !feature.requirements.some((requirement) => requirement.covered)) {
    signals.push('untested');
  }
  if (feature.tasks.some((task) => !task.done)) {
    signals.push('in-flight');
  } else if (feature.stage === 'planned' && feature.tasks.length === 0) {
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
