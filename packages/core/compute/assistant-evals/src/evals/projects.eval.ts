//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

const PROJECT_NAME = 'Harbor';

const PLAN = [
  { bullet: 'Draft the schema', keyword: 'schema' },
  { bullet: 'Wire the importer', keyword: 'importer' },
  { bullet: 'Benchmark the query path', keyword: 'benchmark' },
  { bullet: 'Write the migration guide', keyword: 'migration' },
];

const MILESTONE_NAME = 'Alpha';
const DONE_KEYWORD = 'schema';
const DESIGN_DOC_NAME = 'Harbor design';
const DESIGN_KEYWORD = 'columnar';

const REQUIRED_TOOLS = [
  'tasks-get-outline',
  'tasks-create',
  'tasks-create-milestone',
  'space-add-object',
  'projects-add-artifact',
];

/** Entity id underlying a ref or object URI, so space-qualified and local URIs compare equal. */
const entityId = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

/** The project, its task set and the tasks on it — the ledger every scorer below reads. */
const ledger = Effect.gen(function* () {
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
  if (!project || !taskSet) {
    return undefined;
  }
  const tasks = yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
  const matched = PLAN.map((item) => tasks.find((candidate) => candidate.title?.toLowerCase().includes(item.keyword)));
  return { project, taskSet, tasks, matched };
});

/** The Alpha milestone, and how many of the planned tasks are filed under it. */
const milestoneFiling = Effect.gen(function* () {
  const found = yield* ledger;
  const milestone = yield* findObject(Milestone.Milestone, (candidate) => candidate.name === MILESTONE_NAME);
  if (!found || !milestone || !found.taskSet.milestones.some((ref) => entityId(ref.uri) === milestone.id)) {
    return 0;
  }
  return found.matched.filter((candidate) => candidate?.milestone && entityId(candidate.milestone.uri) === milestone.id)
    .length;
});

/** What the session filed into the project's artifacts: the outline itself, and the design document. */
const filedArtifacts = Effect.gen(function* () {
  const found = yield* ledger;
  if (!found) {
    return { outlineFiled: false, designDocFiled: false };
  }
  const { project } = found;
  const outlineId = project.outline ? entityId(project.outline.uri) : undefined;
  const artifacts = yield* Effect.forEach(project.artifacts, (ref) =>
    Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
  );
  const designDoc = artifacts.find(
    (candidate) => Obj.instanceOf(Markdown.Document, candidate) && !!candidate.name?.toLowerCase().includes('design'),
  );
  const designText =
    designDoc && Obj.instanceOf(Markdown.Document, designDoc)
      ? yield* Database.load(designDoc.content).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
  return {
    outlineFiled: !!outlineId && project.artifacts.some((ref) => entityId(ref.uri) === outlineId),
    designDocFiled: !!designText?.content.toLowerCase().includes(DESIGN_KEYWORD),
  };
});

const SCORERS = [
  Scorer.make({
    name: 'tasks-created',
    description: "One task per open outline item, on the project's own task set.",
    query: ledger,
    score: (found) => (found?.matched.filter(Boolean).length ?? 0) / PLAN.length,
  }),
  Scorer.make({
    name: 'filed-under-milestone',
    description: 'The Alpha milestone is in the set and every created task references it.',
    query: milestoneFiling,
    score: (filed) => filed / PLAN.length,
  }),
  Scorer.make({
    name: 'closed-the-right-task',
    description: 'Exactly one task is done, and it is the schema item.',
    query: ledger,
    score: (found) => {
      const done = found?.tasks.filter((candidate) => candidate.status === 'done') ?? [];
      return done.length === 1 && !!done[0].title?.toLowerCase().includes(DONE_KEYWORD);
    },
  }),
  Scorer.make({
    name: 'outline-filed-as-artifact',
    description: "The outline is in the project's artifacts (projects-add-artifact).",
    query: filedArtifacts,
    score: ({ outlineFiled }) => outlineFiled,
  }),
  Scorer.make({
    name: 'design-doc-filed',
    description: "A design document carrying the finding is in the project's artifacts.",
    query: filedArtifacts,
    score: ({ designDocFiled }) => designDocFiled,
  }),
  Scorer.toolCalls({
    name: 'project-verbs-reached',
    description: 'The outline/task/milestone/artifact verbs were called, and none returned an error.',
    score: (invocations) => {
      const called = new Set(invocations.map((invocation) => invocation.name));
      return REQUIRED_TOOLS.every((name) => called.has(name)) && invocations.every(({ error }) => !error);
    },
  }),
];

const task = createEvalRunner({
  instructions: trim`
    You manage the "${PROJECT_NAME}" project (its reference is bound into this chat).
    Its outline holds a rough plan. Do all of the following, using the project's tools:
    1. Read the project's outline and create one task on the project for each open item, keeping
       the item's wording as the task title.
    2. Create a milestone called "${MILESTONE_NAME}" on the project, and file every one of those
       tasks under it.
    3. Mark the task for the schema item done.
    4. Write a design document named "${DESIGN_DOC_NAME}" recording the one finding that matters:
       the importer should use a columnar layout. File it into the project's artifacts.
    5. File the outline itself into the project's artifacts.
    Then reply with the number of tasks still open.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: [...getDefaultSkills(), Ref.make(ProjectSkill.make())],
  plugins: [ProjectsPlugin.make(), TasksPlugin.make(), MarkdownPlugin.make()],
  types: [Project.Project, Markdown.Document, Milestone.Milestone, Outline.Outline, Task.Task, TaskSet.TaskSet],
  timeout: 300_000,
  seed: ({ instructions }) =>
    Effect.gen(function* () {
      const outline = yield* Database.add(
        Outline.make({ name: `${PROJECT_NAME} plan`, content: PLAN.map((item) => `- [ ] ${item.bullet}`).join('\n') }),
      );
      const project = yield* Database.add(
        Project.make({ name: PROJECT_NAME, instructions: Ref.make(instructions), outline: Ref.make(outline) }),
      );

      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(
        Chat.make({ name: `${PROJECT_NAME} Chat`, feed: Ref.make(feed), instructions: Ref.make(instructions) }),
      );
      Chat.linkCompanion({ chat, subject: project });
      yield* Database.flush();

      return { objects: [Ref.make(project)], chat: Ref.make(chat) };
    }),
  scorers: SCORERS,
});

evalite('Projects — a project chat turns its outline into a task ledger', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
