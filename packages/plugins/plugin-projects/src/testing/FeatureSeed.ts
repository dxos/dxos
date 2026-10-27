//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { type Database, DXN, Obj, Ref, Relation } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { File, Milestone, PullRequest, Task } from '@dxos/types';

import { Feature, Showcase } from '#types';

import { type FeatureModel } from '../components/FeatureCard/feature.ts';
import { SAMPLE_FEATURES } from '../components/FeatureCard/testing.ts';

/** The types a database needs to hold a seeded project. */
export const types = [
  Feature.Feature,
  Feature.DependsOn,
  Feature.Implements,
  Project.Project,
  Instructions.Instructions,
  Showcase.Showcase,
  Showcase.Demonstrates,
  Task.Task,
  Milestone.Milestone,
  Text.Text,
  File.File,
  PullRequest.PullRequest,
];

/**
 * Writes card models into a database as the objects and relations they are derived from — features with their
 * subfeatures (as features naming their parent), `DependsOn`, tasks and milestones with `Implements`, and showcases
 * with `Demonstrates` — all in one project. Ids in the models are only keys within the seed.
 */
export const seed = (
  db: Database.Database,
  { name = 'Inbox and agents', features = SAMPLE_FEATURES }: { name?: string; features?: readonly FeatureModel[] } = {},
): Project.Project => {
  const project = db.add(Project.make({ name }));
  const objects = new Map<string, Feature.Feature>();
  for (const model of features) {
    const feature = db.add(
      Feature.make({
        name: model.name,
        description: model.description,
        status: model.status,
        requirements: model.requirements.map((requirement) => ({ ...requirement })),
        specs: [...model.specs],
        code: model.code.map((link) => ({ ...link })),
        project: Ref.make(project),
      }),
    );
    for (const subfeature of model.subfeatures) {
      db.add(Feature.make({ name: subfeature.name, status: subfeature.status, parent: Ref.make(feature) }));
    }
    // A model's link names the key only; the mnemonic comes from the object the seed creates.
    const link = model.link ? DXN.tryMake(model.link) : undefined;
    if (link) {
      Obj.update(feature, (feature) => {
        Obj.getMeta(feature).key = DXN.getName(link);
      });
    }
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
    for (const { title, done, active, milestone: milestoneName } of model.tasks) {
      const task = db.add(
        Task.make({
          title,
          status: done ? 'done' : active ? 'started' : 'todo',
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

  return project;
};
