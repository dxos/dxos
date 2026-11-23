//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as Templates from '@dxos/plugin-projects/Templates';
import { Task, TaskSet } from '@dxos/types';

import { BrainSkill } from '#skills';

/**
 * Bound to every chat the project delegates, so no task depends on the agent enabling a skill. Sheet, Presenter and
 * Markdown are named by key so plugin-brain does not depend on their plugins; a key with no plugin behind it binds
 * nothing.
 */
const SKILL_KEYS = [BrainSkill.key, 'org.dxos.skill.sheet', 'org.dxos.skill.presenter', 'org.dxos.skill.markdown'];

/** How every task is worked; each line is a step an agent otherwise loses a turn rediscovering, or gets wrong. */
const INSTRUCTIONS = `This project reports what a community's chat says. The space's memory holds the facts a crawl of \
its channels extracted: who asked what, what members use, what went wrong. Read it with the Brain skill \
(\`${BrainSkill.key}\`); answer from the memory only, never from what you know about the product.

Each task asks one question and names the artifact its answer goes in. For each task:
1. Query the memory with SPARQL until the counts are complete. Survey first (the predicates and their counts), then \
read in windows of at most 50 rows; a result with a \`note\` is truncated.
2. Make the artifact the task names. Name it by what it shows ("Workers draws the most questions"), not by the task.
3. File it on this project and on the task in one call: Add project artifact with \`project\`, \`object\` and \`task\`.
4. Set the task to review, with one sentence in its log on what the artifact shows.

A sheet holds the data the chart is drawn from: a header row with the series names, the category (or the week) in \
the first column and one numeric column per series. Draw the chart with Add Chart over exactly the rows it should \
show and \`header: true\`; notes and left-out rows go below them, outside the chart's range.

Report in aggregate. Describe people by their role, never by name or account, and leave out anything personal. A \
negated fact (factuality ending in "-") is something the source said is not so. A count of two or three is too small \
to carry a finding: say so in the artifact rather than drawing a trend from it.

Work only the tasks you are given, in order, and stop when each is in review.`;

export type TaskSeed = Pick<Task.Task, 'title' | 'description' | 'estimate'>;

export const PRODUCTS: TaskSeed = {
  title: 'Chart the questions by product',
  description:
    "Which products draw the most questions? Read the questions members asked (`dx:asked`, the question's text in `schema:text`), assign each to the product it is about and count them. A question that names no product is not a product: count those apart and leave them out of the rows the chart draws, so one catch-all bar does not flatten the rest. Artifact: a sheet with one row per product and its question count, most-asked first, a `bar` chart of those rows, and below them a note with how many questions named no product.",
  estimate: 'xs',
};

export const WEEKS: TaskSeed = {
  title: 'Chart the question volume by week',
  description:
    "How did the volume of questions change over the crawl? Count the questions asked per ISO week, by each fact's `prov:generatedAtTime`; leave out facts dated 1970, which carry no time. The crawl starts and ends partway through a week, so the first and last weeks are partial: chart only the full weeks, since a partial week reads as a rise or a drop that is not there. Artifact: a sheet with one row per full week and its question count, oldest first, an `xy` chart of those rows, and below them the partial weeks with their counts, marked partial.",
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

/** The analyses, in the order the list shows them; the deck follows and depends on all of them. */
export const ANALYSES: ReadonlyArray<TaskSeed> = [PRODUCTS, WEEKS, STACK, PROBLEMS, DOCS];

/** The project, its instructions and its six tasks, in memory; the create flow persists them with one add. */
export const makeProject = (name?: string): Project.Project => {
  const project = Templates.scaffoldProject({
    name: name ?? 'Community findings',
    description: "Findings from a community's chat, read from the space memory: one sheet, brief or deck per task.",
    text: INSTRUCTIONS,
    skills: SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
  });

  const analyses = ANALYSES.map((seed) => Task.make({ ...seed, status: 'todo' }));
  const deck = Task.make({ ...DECK, status: 'todo' });
  Obj.update(deck, (deck) => {
    deck.dependsOn = analyses.map((task) => Ref.make(task));
  });

  const taskSet = project.taskSet?.target;
  if (taskSet) {
    for (const task of [...analyses, deck]) {
      TaskSet.addTaskToSet(taskSet, task);
    }
  }

  return project;
};

/**
 * "Community Findings" project template: five tasks that each ask the space's memory one question and name the
 * artifact the answer goes in (four sheets with charts and a docs-gap brief), and a deck that presents them. The
 * memory is not part of the project — a community's facts are imported through the Memory panel — so the template
 * applies to any space, and the tasks are handed to the agent once the memory holds them.
 */
export const communityFindings: ProjectCapabilities.Template = {
  id: 'org.dxos.project.communityFindings',
  label: 'Community Findings',
  icon: 'ph--chart-bar--regular',
  scaffold: ({ name }) => Effect.sync(() => makeProject(name)),
};
