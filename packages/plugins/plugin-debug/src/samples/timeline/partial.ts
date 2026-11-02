//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import * as Feature from '@dxos/plugin-projects/Feature';
import * as Spec from '@dxos/plugin-projects/Spec';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import { Text } from '@dxos/schema';
import { Outline, SpecDocument, Task, TaskSet } from '@dxos/types';

import specContent from '../../../assets/timeline/SPEC.mdl?raw';
import { makeEvents } from '../presenter/partial.ts';

//
// The timeline chart's own feature map: what has been built (charts as objects, the timeline, slide embeds, the
// Presenter space), what is left (the research skill), and the plan that moves it: a test fixture (done), the spec,
// a drawing of the architecture, and the spec's first phase.
//

/** The project skill carries the feature operations; a plain key, as in the `SkillsAnnotation` idiom. */
const PROJECT_SKILL_KEY = 'org.dxos.skill.project';
const DRAWING_SKILL_KEY = 'org.dxos.skill.drawing';

/**
 * The spec's repo-style path. Features cite `<path>#F-n`, and the spec carries the path as its foreign key, so a
 * feature card opens this object rather than a GitHub URL that does not exist for a template.
 */
const SPEC_PATH = 'timeline/SPEC.mdl';

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
  /** Its parts, each added as a feature whose parent is this one. */
  readonly subfeatures?: readonly { readonly name: string; readonly status: Feature.Status }[];
  /** Keys of the features this one needs. */
  readonly needs?: readonly string[];
};

const FEATURES: readonly FeatureSeed[] = [
  {
    key: 'charts',
    name: 'Chart objects',
    description: 'Each chart is its own object, owned by its sheet, so a document can embed it.',
    status: 'operational',
    spec: `${SPEC_PATH}#F-1`,
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
    spec: `${SPEC_PATH}#F-2`,
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
    spec: `${SPEC_PATH}#F-3`,
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
    spec: `${SPEC_PATH}#F-4`,
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
    spec: `${SPEC_PATH}#F-5`,
    needs: ['timeline'],
  },
];

type TaskSeed = {
  readonly title: string;
  readonly description: string;
  /** Key of the feature it moves. */
  readonly feature: string;
  /** Done, with the events sheet filed on it. */
  readonly fixture?: boolean;
};

/** The planned work in order, each step needing the one before it; the fixture is already done. */
const TASKS: readonly TaskSeed[] = [
  {
    title: 'Create a test fixture',
    description:
      'A sheet of events, one per row (date, category, title, description, image), with a timeline chart of its range: the same sheet the Presenter space uses.',
    feature: 'timeline',
    fixture: true,
  },
  {
    title: 'Complete the spec',
    description:
      'The Timeline spec in this space writes F-1 to F-4 and only names F-5, the research skill. Write its feat block, add scenarios for F-3 and F-4, and append a decision to the Changelog.',
    feature: 'timeline',
  },
  {
    title: 'Draw the proposed architecture',
    description:
      "A diagram on the canvas, filed on this project, before any code: the sheet and its chart objects, the compute graph that evaluates a chart's range, the timeline component, and the article, section and slide surfaces that show a chart. Write it in the Drawing skill's diagram language and let the layout engine place it.",
    feature: 'timeline',
  },
  {
    title: 'Implement phase 1 of the spec',
    description:
      "Build what the spec's first phase states (F-1 and F-2), against the test fixture, and check each requirement as it is met.",
    feature: 'timeline',
  },
  {
    title: 'Decide where the research skill lives',
    description: 'A Composer skill run in the app, or a Claude Code skill run against the repo.',
    feature: 'research',
  },
  {
    title: 'Check Escape with an embed showing',
    description: 'Escape should leave the presentation while a slide shows an embedded object.',
    feature: 'embeds',
  },
];

/** Steps that follow one another: the spec, the drawing of it, then its first phase. */
const SEQUENCE = ['Complete the spec', 'Draw the proposed architecture', 'Implement phase 1 of the spec'];

export type Provides = {
  project: Project.Project;
  /** The feature map: names the project and owns the spec document. */
  map: Spec.Spec;
  features: Feature.Feature[];
  tasks: Task.Task[];
  /** The events sheet the fixture task produced. */
  fixture: Sheet.Sheet;
  spec: SpecDocument.SpecDocument;
};

export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('timeline', {
  // `Project.make` builds the project's outline and the instructions keep their prose as a Text.
  schemas: [
    Project.Project,
    Instructions.Instructions,
    Outline.Outline,
    Text.Text,
    TaskSet.TaskSet,
    Task.Task,
    Spec.Spec,
    Feature.Feature,
    Feature.DependsOn,
    Feature.Implements,
    Sheet.Sheet,
    Sheet.Chart,
    SpecDocument.SpecDocument,
  ],
  run: () =>
    Effect.gen(function* () {
      const { sheet: events } = makeEvents();
      const fixture = yield* Database.add(events);
      const spec = yield* Database.add(
        Obj.make(SpecDocument.SpecDocument, {
          name: 'Timeline',
          content: Ref.make(Text.make({ content: specContent })),
          [Obj.Meta]: { keys: [{ source: Feature.SPEC_KEY_SOURCE, id: SPEC_PATH }] },
        }),
      );

      const taskSet = yield* Database.add(TaskSet.make({ name: 'Timeline' }));
      const tasks = TASKS.map(({ title, description, fixture: isFixture }) =>
        Task.make({
          title,
          description,
          status: isFixture ? 'done' : 'todo',
          ...(isFixture && { artifacts: [Ref.make(fixture)] }),
        }),
      );
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });
      const taskOf = (title: string) => tasks[TASKS.findIndex((seed) => seed.title === title)];
      for (const [index, title] of SEQUENCE.entries()) {
        if (index > 0) {
          Obj.update(taskOf(title), (task) => {
            task.dependsOn = [Ref.make(taskOf(SEQUENCE[index - 1]))];
          });
        }
      }

      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Timeline',
          text: INSTRUCTIONS,
          skills: [PROJECT_SKILL_KEY, DRAWING_SKILL_KEY].map((key) => Ref.fromURI(Skill.registryURI(key))),
        }),
      );
      const project = yield* Database.add(
        Project.make({
          name: 'Timeline',
          description: 'The timeline chart, its embeds in slides, and the Presenter space.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(taskSet),
          artifacts: [Ref.make(fixture)],
        }),
      );

      // The spec document lives in the map, which the project that tracks its tasks owns.
      const map = yield* Database.add(Spec.make({ name: 'Timeline', document: Ref.make(spec) }));
      Obj.update(project, (project) => {
        project.spec = Ref.make(map);
      });
      const byKey = new Map<string, Feature.Feature>();
      for (const seed of FEATURES) {
        const feature = yield* Database.add(
          Feature.make({
            name: seed.name,
            description: seed.description,
            status: seed.status,
            specs: [seed.spec],
          }),
        );
        if (seed.subfeatures) {
          const parts: Ref.Ref<Feature.Feature>[] = [];
          for (const subfeature of seed.subfeatures) {
            parts.push(Ref.make(yield* Database.add(Feature.make({ ...subfeature }))));
          }
          const breakdown = yield* Database.add(Spec.make({ name: seed.name, features: parts }));
          Obj.update(feature, (feature) => {
            feature.spec = Ref.make(breakdown);
          });
        }
        byKey.set(seed.key, feature);
      }
      Obj.update(map, (map) => {
        map.features.push(...[...byKey.values()].map((feature) => Ref.make(feature)));
      });

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

      return { project, map, features: [...byKey.values()], tasks, fixture, spec };
    }),
});
