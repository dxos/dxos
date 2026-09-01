//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Chat } from '@dxos/assistant-toolkit';
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

import { findObject, toolInvocations } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
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
  dbQuery: () =>
    Effect.gen(function* () {
      const invocations = yield* toolInvocations();
      const called = new Set(invocations.map((invocation) => invocation.name));
      const trace = {
        missingTools: REQUIRED_TOOLS.filter((name) => !called.has(name)),
        erroredTools: invocations.filter((invocation) => invocation.error).map((invocation) => invocation.name),
      };
      const empty = {
        ...trace,
        matchedTasks: 0,
        filedUnderMilestone: 0,
        expected: PLAN.length,
        closedTheRightOne: false,
        outlineFiled: false,
        designDocFiled: false,
      };

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
      if (!project || !taskSet) {
        return empty;
      }

      const tasks = yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
      const matched = PLAN.map((item) =>
        tasks.find((candidate) => candidate.title?.toLowerCase().includes(item.keyword)),
      );

      const milestone = yield* findObject(Milestone.Milestone, (candidate) => candidate.name === MILESTONE_NAME);
      const milestoneInSet = !!milestone && taskSet.milestones.some((ref) => entityId(ref.uri) === milestone.id);
      const filedUnderMilestone = !milestoneInSet
        ? 0
        : matched.filter((candidate) => candidate?.milestone && entityId(candidate.milestone.uri) === milestone.id)
            .length;

      const doneTasks = tasks.filter((candidate) => candidate.status === 'done');
      const closedTheRightOne = doneTasks.length === 1 && !!doneTasks[0].title?.toLowerCase().includes(DONE_KEYWORD);

      const outlineId = project.outline ? entityId(project.outline.uri) : undefined;
      const outlineFiled = !!outlineId && project.artifacts.some((ref) => entityId(ref.uri) === outlineId);

      const artifacts = yield* Effect.forEach(project.artifacts, (ref) =>
        Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
      );
      const designDoc = artifacts.find(
        (candidate) =>
          Obj.instanceOf(Markdown.Document, candidate) && !!candidate.name?.toLowerCase().includes('design'),
      );
      const designText =
        designDoc && Obj.instanceOf(Markdown.Document, designDoc)
          ? yield* Database.load(designDoc.content).pipe(Effect.orElseSucceed(() => undefined))
          : undefined;
      const designDocFiled = !!designText?.content.toLowerCase().includes(DESIGN_KEYWORD);

      return {
        ...trace,
        matchedTasks: matched.filter(Boolean).length,
        filedUnderMilestone,
        expected: PLAN.length,
        closedTheRightOne,
        outlineFiled,
        designDocFiled,
      };
    }),
});

evalite('Projects — a project chat turns its outline into a task ledger', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'tasks-created',
      description: "One task per open outline item, on the project's own task set.",
      scorer: ({ output }) => output.dbQuery.matchedTasks / output.dbQuery.expected,
    },
    {
      name: 'filed-under-milestone',
      description: 'The Alpha milestone is in the set and every created task references it.',
      scorer: ({ output }) => output.dbQuery.filedUnderMilestone / output.dbQuery.expected,
    },
    {
      name: 'closed-the-right-task',
      description: 'Exactly one task is done, and it is the schema item.',
      scorer: ({ output }) => (output.dbQuery.closedTheRightOne ? 1 : 0),
    },
    {
      name: 'outline-filed-as-artifact',
      description: "The outline is in the project's artifacts (projects-add-artifact).",
      scorer: ({ output }) => (output.dbQuery.outlineFiled ? 1 : 0),
    },
    {
      name: 'design-doc-filed',
      description: "A design document carrying the finding is in the project's artifacts.",
      scorer: ({ output }) => (output.dbQuery.designDocFiled ? 1 : 0),
    },
    {
      name: 'project-verbs-reached',
      description: 'The outline/task/milestone/artifact verbs were called, and none returned an error.',
      scorer: ({ output }) =>
        output.dbQuery.missingTools.length === 0 && output.dbQuery.erroredTools.length === 0 ? 1 : 0,
    },
  ],
});
