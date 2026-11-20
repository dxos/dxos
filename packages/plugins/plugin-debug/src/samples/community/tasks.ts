//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/echo/Key';
import { Task, TaskSet } from '@dxos/types';

import { daysAgo } from './util.ts';

//
// One task per finding, each naming the artifact it ends in, then a deck that presents the rest. Every analysis reads
// the same memory and none needs another's result, so the first five can be handed to the agent together or one by
// one; only the deck waits for them.
//

export type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
};

export const PRODUCTS: TaskSeed = {
  title: 'Chart the questions by product',
  description:
    "Which Cloudflare products draw the most questions? Read the questions members asked (`dx:asked`, the question's text in `schema:text`), assign each to the product it is about (Workers, D1, R2, Pages, Workers AI, …) and count them. Artifact: a sheet with one row per product and its question count, most-asked first, and a `bar` chart of it.",
  estimate: 'xs',
};

export const WEEKS: TaskSeed = {
  title: 'Chart the question volume by week',
  description:
    "How did the volume of questions change over the sixty days? Count the questions asked per ISO week, by each fact's `prov:generatedAtTime`; leave out facts dated 1970, which carry no time. Artifact: a sheet with one row per week and its question count, oldest first, and an `xy` chart of it.",
  estimate: 'xs',
};

export const STACK: TaskSeed = {
  title: 'Chart what members build with',
  description:
    'What do members say they use? Count the objects of `dx:uses`, merging names for the same product ("R2" and "Cloudflare R2", "wrangler" and "Wrangler"). Artifact: a sheet with one row per product and the number of members who use it, and a `bar` chart of the top fifteen.',
  estimate: 'xs',
};

export const PROBLEMS: TaskSeed = {
  title: 'Chart the recurring problems',
  description:
    'Which problems come back? From the questions and the facts that report trouble (errors, limits, timeouts, blocked requests, failed deploys, missing email), group the problems by kind and by product and count them. A problem reported once is not recurring. Artifact: a sheet with one row per kind of problem, its product and its count, and a `bar` chart of it.',
  estimate: 's',
};

export const DOCS: TaskSeed = {
  title: 'Write the docs-gap brief',
  description:
    'Which questions does the documentation leave open? Find the questions asked more than once, in the same or similar words, and group them by product. Artifact: a markdown document with one section per product, each listing the recurring questions, how often they were asked, and what a docs page would have to say to answer them. Quote the questions; do not name who asked.',
  estimate: 's',
};

export const DECK: TaskSeed = {
  title: 'Present the findings',
  description:
    "Turn the findings into a deck for the developer-relations team. Artifact: a presentation with a cover slide, one slide per chart from this project's four sheets (each chart object itself as a slide), and a closing slide with the three largest gaps from the docs-gap brief.",
  estimate: 'xs',
};

/** The analyses, in the order the list shows them, then the deck that depends on all of them. */
const ANALYSES: ReadonlyArray<TaskSeed> = [PRODUCTS, WEEKS, STACK, PROBLEMS, DOCS];

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

const make = (seed: TaskSeed) =>
  Task.make({
    title: seed.title,
    description: seed.description,
    estimate: seed.estimate,
    status: 'todo',
    // Task carries no due date; its dates are activity-log lines, so that is where they go.
    history: [
      {
        id: EntityId.random(),
        date: daysAgo(0),
        event: 'created' as const,
        description: 'Filed from the Cloudflare community template.',
      },
    ],
  });

/** Five analyses and the deck that presents them. */
export const Tasks: SampleSpace.Partial<TasksResult> = SampleSpace.partial('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({
          name: 'Cloudflare community',
          description: 'What sixty days of the Cloudflare Developers Discord say, one artifact per finding.',
        }),
      );

      const analyses = ANALYSES.map(make);
      const deck = make(DECK);
      const tasks = [...analyses, deck];
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      Obj.update(deck, (deck) => {
        deck.dependsOn = analyses.map((task) => Ref.make(task));
      });

      return { taskSet, tasks };
    }),
});
