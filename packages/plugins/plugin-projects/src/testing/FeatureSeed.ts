//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Database, Ref, Relation } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { File, Milestone, PullRequest, Task } from '@dxos/types';

import { Feature, FeatureMap, Showcase } from '#types';

import { type FeatureModel } from '../components/FeatureCard/feature.ts';
import { SAMPLE_FEATURES } from '../components/FeatureCard/testing.ts';

/** The types a database needs to hold a seeded map. */
export const types = [
  Feature.Feature,
  Feature.DependsOn,
  Feature.Implements,
  FeatureMap.FeatureMap,
  Showcase.Showcase,
  Showcase.Demonstrates,
  Task.Task,
  Milestone.Milestone,
  Text.Text,
  File.File,
  PullRequest.PullRequest,
];

/**
 * Writes card models into a database as the objects and relations they are derived from — features with
 * their subfeatures, `DependsOn`, tasks and milestones with `Implements`, and showcases with `Demonstrates` —
 * and a map listing the top-level features. Ids in the models are only keys within the seed.
 */
export const seed = (
  db: Database.Database,
  { name = 'Inbox and agents', features = SAMPLE_FEATURES }: { name?: string; features?: readonly FeatureModel[] } = {},
): FeatureMap.FeatureMap => {
  const objects = new Map<string, Feature.Feature>();
  for (const model of features) {
    const feature = db.add(
      Feature.make({
        name: model.name,
        description: model.description,
        status: model.status,
        specs: [...model.specs],
        subfeatures: model.subfeatures.map((subfeature) => ({ ...subfeature })),
      }),
    );
    objects.set(model.id, feature);
  }

  const milestones = new Map<string, Milestone.Milestone>();
  const milestone = (name: string) => {
    const existing = milestones.get(name) ?? db.add(Milestone.make({ name }));
    milestones.set(name, existing);
    return existing;
  };

  for (const model of features) {
    const feature = objects.get(model.id);
    if (!feature) {
      continue;
    }
    for (const id of model.dependsOn) {
      const dependency = objects.get(id);
      if (dependency) {
        db.add(Feature.makeDependsOn({ [Relation.Source]: feature, [Relation.Target]: dependency }));
      }
    }
    for (const { title, done, milestone: milestoneName } of model.tasks) {
      const task = db.add(
        Task.make({
          title,
          status: done ? 'done' : 'started',
          milestone: milestoneName ? Ref.make(milestone(milestoneName)) : undefined,
        }),
      );
      db.add(Feature.makeImplements({ [Relation.Source]: task, [Relation.Target]: feature }));
    }
    for (const { name: showcaseName } of model.showcases) {
      const showcase = db.add(
        Showcase.make({
          name: showcaseName,
          content: `# ${showcaseName}\n\nWhat was shown, and how to reproduce it:\n\n1. Open the feature.\n2. Follow the steps.\n`,
        }),
      );
      db.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: feature }));
    }
  }

  return db.add(FeatureMap.make({ name, features: [...objects.values()].map((feature) => Ref.make(feature)) }));
};
