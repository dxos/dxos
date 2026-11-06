//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { SOFTWARE_DIALECT, printBlock, resolveBlockSchemas } from '@dxos/deus/schema';
import { type Database, Obj, Ref, Relation } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { File, Milestone, PullRequest, Task } from '@dxos/types';

import { FeatureMap, Showcase, SpecItem } from '#types';

import { type FeatureModel } from '../components/FeatureCard/feature.ts';
import { SAMPLE_FEATURES } from '../components/FeatureCard/testing.ts';

/** The types a database needs to hold a seeded spec. */
export const types = [
  Spec.Spec,
  SpecItem.Implements,
  Project.Project,
  Instructions.Instructions,
  Markdown.Document,
  Showcase.Demonstrates,
  Task.Task,
  Milestone.Milestone,
  Text.Text,
  File.File,
  PullRequest.PullRequest,
];

/** Lays out a spec's text around its features' blocks, each looked up by its model's id. */
export type Layout = (block: (id: string) => string) => string;

/**
 * The sample features as a spec is first written: prose and goals, the features grouped under headings with notes
 * between them, and ideas not yet made features.
 */
export const INBOX_LAYOUT: Layout = (embed) =>
  [
    'Inbox and agents puts mail, calendars and tasks in one place, with agents that take work off the list.',
    '## Goals',
    '- One inbox for every account a person has.\n- Nothing leaves the device unencrypted.\n- An agent can take any task a person could, and says what it did.',
    '## Features',
    '### Accounts',
    'People sign in once per provider, and the app keeps the grants fresh.',
    embed('accounts'),
    embed('tokens'),
    '### Mail',
    embed('sync'),
    embed('compose'),
    embed('triage'),
    'Triage should learn from what people archive without asking them. How much it may infer is still open.',
    '### Work',
    embed('tasks'),
    embed('feature-map'),
    embed('delegate'),
    '## Ideas',
    'People can snooze a thread until someone replies.',
    'A morning digest of what agents did overnight',
  ].join('\n\n') + '\n';

const featSchema = resolveBlockSchemas('', { dialects: [SOFTWARE_DIALECT] }).get('feat')!;

/** A model's `feat` block, keyed by its id. */
const printFeature = (model: FeatureModel, breakdown?: Spec.Spec) =>
  printBlock(featSchema, model.id, {
    title: model.name,
    ...(model.description && { prose: model.description }),
    fields: {
      status: model.status,
      ...(model.dependsOn.length > 0 && { depends: [...model.dependsOn] }),
      ...(breakdown && { spec: `echo:///${breakdown.id}` }),
      req: model.requirements.map(({ key, id, text }, index) => ({ key: key ?? id ?? `${model.id}.${index}`, text })),
    },
  });

/**
 * Writes card models into a database as the spec text and relations they are derived from: a `feat` block per model
 * on one spec that names one project (made unless given), subfeatures on a spec each parent cites, tasks and milestones
 * with `Implements`, and showcases with `Demonstrates`. Each model's id is its block's key.
 */
export const seed = (
  db: Database.Database,
  {
    name = 'Inbox and agents',
    features = SAMPLE_FEATURES,
    project = db.add(Project.make({ name })),
    layout,
  }: { name?: string; features?: readonly FeatureModel[]; project?: Project.Project; layout?: Layout } = {},
): Spec.Spec => {
  const dialects = [FeatureMap.SOFTWARE_DIALECT];
  const breakdowns = new Map<string, Spec.Spec>();
  for (const model of features) {
    if (model.subfeatures.length > 0) {
      const content = model.subfeatures
        .map((subfeature) =>
          printBlock(featSchema, subfeature.id, { title: subfeature.name, fields: { status: subfeature.status } }),
        )
        .join('\n\n');
      breakdowns.set(model.id, db.add(Spec.make({ name: model.name, dialects, content: content + '\n' })));
    }
  }
  const blocks = new Map(features.map((model) => [model.id, printFeature(model, breakdowns.get(model.id))]));
  const content = layout ? layout((id) => blocks.get(id) ?? '') : [...blocks.values()].join('\n\n') + '\n';
  const spec = db.add(Spec.make({ name, dialects, content }));
  Obj.update(project, (project) => {
    project.specs.push(Ref.make(spec), ...[...breakdowns.values()].map((breakdown) => Ref.make(breakdown)));
  });

  const milestones = new Map<string, Milestone.Milestone>();
  const milestone = (name: string) => {
    const existing = milestones.get(name) ?? db.add(Milestone.make({ name }));
    milestones.set(name, existing);
    return existing;
  };

  for (const model of features) {
    for (const { title, done, active, milestone: milestoneName } of model.tasks) {
      const task = db.add(
        Task.make({
          title,
          status: done ? 'done' : active ? 'started' : 'todo',
          milestone: milestoneName ? Ref.make(milestone(milestoneName)) : undefined,
        }),
      );
      db.add(SpecItem.makeImplements({ [Relation.Source]: task, [Relation.Target]: spec, item: model.id }));
    }
    for (const { name: showcaseName } of model.showcases) {
      // A document stands in for the deck, whose type is plugin-presenter's: that plugin depends on this one.
      const showcase = db.add(
        Markdown.make({
          name: showcaseName,
          content: `# ${showcaseName}\n\nWhat was shown, and how to reproduce it:\n\n1. Open the feature.\n2. Follow the steps.\n`,
        }),
      );
      db.add(Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: spec, item: model.id }));
    }
  }

  return spec;
};
