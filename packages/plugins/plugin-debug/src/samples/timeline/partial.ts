//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref, Relation } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

//
// The timeline chart's own feature map: what has been built (charts as objects, the timeline, slide embeds, the
// Presenter space), what is left (the research skill, the spec blocks), and the follow-up tasks that move it.
//

/** The project skill carries the feature operations; a plain key, as in the `SkillsAnnotation` idiom. */
const PROJECT_SKILL_KEY = 'org.dxos.skill.project';

const SHEET_SPEC = 'packages/plugins/plugin-sheet/PLUGIN.mdl';
const PRESENTER_SPEC = 'packages/plugins/plugin-presenter/PLUGIN.mdl';
const DEBUG_SPEC = 'packages/plugins/plugin-debug/PLUGIN.mdl';

const INSTRUCTIONS = `This project tracks the timeline chart: a sheet range with one event per row, drawn along a \
vertical spine, and the work around it. Keep the feature map current: each feature's status, its parts as \
subfeatures, the spec block that describes it, and which features need which. File open work as tasks linked to \
the feature it moves.`;

type FeatureSeed = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly status: Feature.Status;
  readonly spec: string;
  readonly subfeatures?: readonly Feature.Subfeature[];
  /** Keys of the features this one needs. */
  readonly needs?: readonly string[];
};

const FEATURES: readonly FeatureSeed[] = [
  {
    key: 'charts',
    name: 'Chart objects',
    description: 'Each chart is its own object, owned by its sheet, so a document can embed it.',
    status: 'operational',
    spec: `${SHEET_SPEC}#F-8`,
    subfeatures: [
      { name: 'Chart type', status: 'operational' },
      { name: 'Sheet migration', status: 'operational' },
      { name: 'Article, section and slide surfaces', status: 'operational' },
    ],
  },
  {
    key: 'timeline',
    name: 'Timeline chart',
    description: 'Events along a vertical spine: spine side, log, linear or compact spacing, and an event card.',
    status: 'prototype',
    spec: `${SHEET_SPEC}#F-9`,
    subfeatures: [
      { name: 'Spines and scales', status: 'operational' },
      { name: 'Category hierarchy and colors', status: 'operational' },
      { name: 'Selection and keyboard', status: 'operational' },
      { name: 'Event cards with images', status: 'operational' },
      { name: 'Text filter', status: 'operational' },
    ],
    needs: ['charts'],
  },
  {
    key: 'embeds',
    name: 'Slide embeds',
    description: 'A presented deck shows an embedded object over the whole viewport, keeping its keys.',
    status: 'prototype',
    spec: PRESENTER_SPEC,
    subfeatures: [
      { name: 'Full-viewport embeds', status: 'operational' },
      { name: 'Keyboard isolation', status: 'operational' },
    ],
    needs: ['charts'],
  },
  {
    key: 'presenter',
    name: 'Presenter space',
    description: 'A space template with the events sheet, its timeline chart and a deck built from markdown.',
    status: 'prototype',
    spec: DEBUG_SPEC,
    subfeatures: [
      { name: 'Deck from a markdown template', status: 'operational' },
      { name: 'Events dataset', status: 'operational' },
    ],
    needs: ['timeline', 'embeds'],
  },
  {
    key: 'research',
    name: 'Timeline research skill',
    description: 'Researches the events for a range of years and a set of categories, and fills a sheet with them.',
    status: 'planned',
    spec: `${SHEET_SPEC}#F-10`,
    needs: ['timeline'],
  },
];

type TaskSeed = {
  readonly title: string;
  readonly description: string;
  /** Key of the feature it moves. */
  readonly feature: string;
};

const TASKS: readonly TaskSeed[] = [
  {
    title: 'Write the chart and timeline spec blocks',
    description:
      'Add feat blocks F-8 (chart objects) and F-9 (timeline chart) to the plugin-sheet spec, with scenarios.',
    feature: 'timeline',
  },
  {
    title: 'Decide where the research skill lives',
    description: 'A Composer skill run in the app, or a Claude Code skill run against the repo.',
    feature: 'research',
  },
  {
    title: 'Add Muse, Dots, Grokbot and the Cursor acquisition',
    description: 'Find their dates and add them to the AI events of the Presenter dataset.',
    feature: 'presenter',
  },
  {
    title: 'Categorize the Patriot Act',
    description: 'Decide whether it stays under Macro or moves to MIC or TIC.',
    feature: 'presenter',
  },
  {
    title: 'Check Escape with an embed showing',
    description: 'Escape should leave the presentation while a slide shows an embedded object.',
    feature: 'embeds',
  },
];

export type Provides = { project: Project.Project; features: Feature.Feature[]; tasks: Task.Task[] };

export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('timeline', {
  // `Project.make` builds the project's outline and the instructions keep their prose as a Text.
  schemas: [
    Project.Project,
    Instructions.Instructions,
    Outline.Outline,
    Text.Text,
    TaskSet.TaskSet,
    Task.Task,
    Feature.Feature,
    Feature.DependsOn,
    Feature.Implements,
  ],
  run: () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Timeline' }));
      const tasks = TASKS.map(({ title, description }) => Task.make({ title, description, status: 'todo' }));
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Timeline',
          text: INSTRUCTIONS,
          skills: [Ref.fromURI(Skill.registryURI(PROJECT_SKILL_KEY))],
        }),
      );
      const project = yield* Database.add(
        Project.make({
          name: 'Timeline',
          description: 'The timeline chart, its embeds in slides, and the Presenter space.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(taskSet),
        }),
      );

      const byKey = new Map<string, Feature.Feature>();
      for (const seed of FEATURES) {
        byKey.set(
          seed.key,
          yield* Database.add(
            Feature.make({
              name: seed.name,
              description: seed.description,
              status: seed.status,
              specs: [seed.spec],
              subfeatures: seed.subfeatures?.map((subfeature) => ({ ...subfeature })),
              project: Ref.make(project),
            }),
          ),
        );
      }

      const featureOf = (key: string): Feature.Feature => {
        const feature = byKey.get(key);
        if (!feature) {
          throw new Error(`Unknown feature: ${key}`);
        }
        return feature;
      };
      for (const seed of FEATURES) {
        for (const need of seed.needs ?? []) {
          yield* Database.add(
            Feature.makeDependsOn({ [Relation.Source]: featureOf(seed.key), [Relation.Target]: featureOf(need) }),
          );
        }
      }
      for (const [index, seed] of TASKS.entries()) {
        yield* Database.add(
          Feature.makeImplements({ [Relation.Source]: tasks[index], [Relation.Target]: featureOf(seed.feature) }),
        );
      }

      return { project, features: [...byKey.values()], tasks };
    }),
});
