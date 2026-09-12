//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import * as Capability from '@dxos/app-framework/Capability';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { PlanningSkill } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Collection, Database, Feed, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { IncidentSpace } from '@dxos/plugin-debug/sample';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { type Actor, Outline, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { judge } from '../judge.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

//
// An outage retrospective, delegated end to end.
//
// The space is the debug plugin's incident sample: a status log that states the technical cause and
// every time that matters, four people's notes that carry the process failures and two claims the
// log contradicts, and four `todo` tasks. The run reproduces what `DelegateTaskToChat` does to a
// chat — the tasks on its checklist, the chat filed under the project, each task started with the
// assistant as assignee and a reviewer set — then hands it the delegation prompt.
//
// The technical cause is table stakes. What is scored is whether the retro recommends what the log
// supports (a page routed to someone who left the team, a renewal reminder on a departed colleague's
// calendar) rather than what the loudest note says (ban Friday deploys, when nothing deployed), and
// whether the work lands where a project expects it: artifacts filed, action items as owned tasks,
// the delegated tasks back in review.
//

const PROJECT_NAME = 'Incident 0516 retrospective';

/** The times the log fixes, as they appear in it. A timeline that follows the log has all four. */
const LOG_TIMES = ['02:00', '02:03', '04:41', '05:12'];

/** Owners an action item may name: the people in the notes. */
const CAST = ['Jae Reyes', 'Priya Nair', 'Dan Walsh', 'Sam Lindqvist'];

/** The two process gaps the evidence supports, by the words a recommendation about them uses. */
const ROUTING_GAP = /rotation|pager|paged|paging|on.?call|escalat/i;
const RENEWAL_GAP = /renew|certificate|cert\b|calendar|reminder|acme|expir/i;

/**
 * Action that would follow a note past the record: a deploy freeze, or work on disk. Matched on
 * titles only, and only in the adopting form — an item to correct the false accounts mentions both
 * and is the right thing to file, so a bare word match would fail the run for getting it right.
 */
const DISTRACTOR_ACTIONS =
  /(?:ban|stop|freeze|halt|restrict|block|pause|no)\s+(?:\w+\s+)?deploy|deploy\s+freeze|disk\s+(?:alert|space|capacity|usage|monitor)|(?:add|increase|expand|free)\s+(?:\w+\s+)?disk/i;

/** Internal detail a customer notice must not carry. */
const INTERNAL = /jae|priya|dan\b|sam\b|okafor|tom\b|acme|pager|rotation|slack/i;

/** The prompt `DelegateTaskToChat` opens the session with. */
const OPENING_PROMPT = trim`
  You have been assigned tasks to work on in this session.
  Read all tasks, then work on them sequentially.
  This may require you to read, update, or create artifacts associated with the project.
  Update the tasklist as you work on each task, and mark tasks ready for review as you complete them.
`;

const RETRO_RUBRIC = trim`
  You are grading an incident retrospective. The incident: a TLS certificate expired, the page went
  to an engineer who had left the team, and support found the on-call engineer by guessing.
  Two claims circulated that the record rules out: that a Friday deploy caused it (nothing deployed)
  and that the database ran out of disk (disk usage was flat).

  Pass only if ALL of the following hold:
  1. The retrospective does not recommend restricting, freezing or banning deploys.
  2. It does not state the disk claim as fact. Mentioning it as a rumour the log contradicts is fine.
  3. It does not blame a named person; it names systems and gaps.
  Fail if any one of them does not hold, and say which.
`;

/** The eval identity as the delegating reviewer, so a finished task lands in review rather than done. */
const REVIEWER: Actor.Actor = { role: 'user', name: 'Eval' };

const lower = (text: string | undefined) => (text ?? '').toLowerCase();

const REQUIRED_TOOLS = ['projects-add-artifact', 'tasks-create'];

/** The documents the session filed on the project, by the name each task asked for. */
const filedDocuments = Effect.gen(function* () {
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  if (!project) {
    return { timeline: '', retro: '', notice: '' };
  }
  const artifacts = yield* Effect.forEach(project.artifacts, (ref) =>
    Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
  );
  const documents = artifacts.filter((candidate): candidate is Markdown.Document =>
    Obj.instanceOf(Markdown.Document, candidate),
  );
  const textOf = (needle: RegExp) => {
    const document = documents.find((candidate) => needle.test(candidate.name ?? ''));
    return document
      ? Database.load(document.content).pipe(
          Effect.map((text) => text.content),
          Effect.orElseSucceed(() => ''),
        )
      : Effect.succeed('');
  };
  return {
    timeline: yield* textOf(/timeline/i),
    retro: yield* textOf(/retro/i),
    notice: yield* textOf(/notice|customer/i),
  };
});

/** The judge's verdict on the filed retrospective; absent when the session filed none. */
const retroVerdict = filedDocuments.pipe(
  Effect.flatMap(({ retro }) =>
    retro ? judge(RETRO_RUBRIC, retro).pipe(Effect.orElseSucceed(() => undefined)) : Effect.succeed(undefined),
  ),
);

/** The project's tasks, split into the four the session was given and the ones it added. */
const taskLedger = Effect.gen(function* () {
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
  if (!taskSet) {
    return { delegated: [] as Task.Task[], created: [] as Task.Task[] };
  }
  const tasks = (yield* Effect.forEach(taskSet.tasks, (ref) =>
    Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
  )).filter((candidate): candidate is Task.Task => !!candidate);
  return {
    delegated: tasks.filter((candidate) => candidate.assignee?.role === 'assistant'),
    created: tasks.filter((candidate) => candidate.assignee?.role !== 'assistant'),
  };
});

const about = (task: Task.Task, needle: RegExp) => needle.test(`${task.title ?? ''} ${task.description ?? ''}`);

const SCORERS = [
  Scorer.make({
    name: 'timeline-follows-the-log',
    description: 'A Timeline artifact carries the four times the log fixes.',
    query: filedDocuments,
    score: ({ timeline }) => LOG_TIMES.filter((time) => timeline.includes(time)).length / LOG_TIMES.length,
  }),
  Scorer.make({
    name: 'timeline-holds-the-disk-claim-as-a-claim',
    description: 'The second-hand disk claim is absent from the timeline, or marked as unsupported by the log.',
    query: filedDocuments,
    // The disk claim may appear, but only as a claim: something the record does not bear out.
    score: ({ timeline }) =>
      !/disk/i.test(timeline) ||
      /second.?hand|unverified|not (?:supported|borne out|confirmed)|contradict|rules? (?:this |it )?out|no evidence|held at 41/i.test(
        timeline,
      ),
  }),
  Scorer.make({
    name: 'retro-names-the-cause',
    description: 'A Retrospective artifact is filed and names the expired certificate.',
    query: filedDocuments,
    score: ({ retro }) => retro.length > 0 && /certificate/i.test(retro),
  }),
  Scorer.make({
    name: 'retro-finds-both-process-gaps',
    description: 'The retrospective names the stale alert routing and the unowned renewal.',
    query: filedDocuments,
    score: ({ retro }) => [ROUTING_GAP.test(retro), RENEWAL_GAP.test(retro)].filter(Boolean).length / 2,
  }),
  Scorer.make({
    name: 'retro-grounded-and-blameless',
    description: 'Judge: no deploy freeze, the disk claim not stated as fact, no named person blamed.',
    query: retroVerdict,
    score: (verdict) => verdict?.pass ?? false,
  }),
  Scorer.make({
    name: 'action-items-are-owned-tasks',
    description: "At least two new tasks on the project's set, each assigned to someone from the notes.",
    query: taskLedger,
    score: ({ created }) =>
      created.length >= 2
        ? created.filter((candidate) => CAST.some((name) => lower(candidate.assignee?.name).includes(lower(name))))
            .length / created.length
        : 0,
  }),
  Scorer.make({
    name: 'action-items-follow-the-evidence',
    description: 'One item on alert routing, one on renewal ownership, none on deploys or disk.',
    query: taskLedger,
    score: ({ created }) =>
      [
        created.some((candidate) => about(candidate, ROUTING_GAP)),
        created.some((candidate) => about(candidate, RENEWAL_GAP)),
        !created.some((candidate) => DISTRACTOR_ACTIONS.test(candidate.title ?? '')),
      ].filter(Boolean).length / 3,
  }),
  Scorer.make({
    name: 'customer-notice-is-plain',
    description: 'A Customer notice artifact names the certificate and carries no internal names or systems.',
    query: filedDocuments,
    score: ({ notice }) => notice.length > 0 && /certificate/i.test(notice) && !INTERNAL.test(notice),
  }),
  Scorer.make({
    name: 'delegated-tasks-back-in-review',
    description: 'Every task the session was given is in review (or done) when it finishes.',
    query: taskLedger,
    // `done` past a named reviewer lands as `review`; either means the session finished the task.
    score: ({ delegated }) =>
      delegated.length > 0
        ? delegated.filter((candidate) => candidate.status === 'review' || candidate.status === 'done').length /
          delegated.length
        : 0,
  }),
  Scorer.toolCalls({
    name: 'project-verbs-reached',
    description: 'Artifacts were filed and tasks created through the project skill, and no tool errored.',
    score: (invocations) => {
      const called = new Set(invocations.map(({ name }) => name));
      return REQUIRED_TOOLS.every((name) => called.has(name)) && invocations.every(({ error }) => !error);
    },
  }),
];

const task = createEvalRunner({
  instructions: OPENING_PROMPT,
  input: Schema.Unknown,
  output: Schema.Unknown,
  // What `bindDelegationContext` binds, plus the defaults every chat has.
  skills: [
    ...getDefaultSkills(),
    Ref.make(PlanningSkill.make()),
    Ref.make(MarkdownSkill.make()),
    Ref.make(ProjectSkill.make()),
  ],
  plugins: [ProjectsPlugin.make(), TasksPlugin.make(), MarkdownPlugin.make()],
  types: [Project.Project, Markdown.Document, Outline.Outline, Task.Task, TaskSet.TaskSet, Collection.Collection],
  // Four tasks, each reading several documents and writing one; well past a single-tool budget.
  timeout: 900_000,
  seed: ({ spaceId }) =>
    Effect.gen(function* () {
      // The template writes into a real space, the way the create-space dialog applies it.
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(spaceId);
      if (!space) {
        return yield* Effect.fail(new Error(`Space not found: ${spaceId}`));
      }
      yield* SampleSpace.applyTo(IncidentSpace(), space);

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      if (!project?.taskSet) {
        return yield* Effect.fail(new Error('The template did not produce the project.'));
      }
      const taskSet = yield* Database.load(project.taskSet);
      const tasks = yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));

      // What delegation does to the chat and the tasks, minus opening the deck.
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ name: PROJECT_NAME, feed: Ref.make(feed) }));
      Obj.update(chat, (chat) => {
        chat.tasks.push(...tasks.map((task) => Ref.make(task)));
      });
      Chat.linkCompanion({ chat, subject: project });
      for (const task of tasks) {
        Task.setStatus(task, 'started', { actor: REVIEWER });
        Obj.update(task, (task) => {
          task.assignee = { role: 'assistant' };
          task.reviewers = [REVIEWER];
        });
      }
      yield* Database.flush();

      return { objects: [Ref.make(project)], chat: Ref.make(chat) };
    }),
  scorers: SCORERS,
});

evalite('Incident retro — a delegated session turns a log and four notes into a filed retro', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});

/**
 * The judge has to be able to fail, or it grades nothing. A retro that swallows both distractors
 * and blames a person by name is what a fail looks like.
 */
const BAD_RETRO = trim`
  # Retrospective — incident 0516

  The API was down for three hours on Saturday because the database ran out of disk after Friday's
  deploy. Mira Okafor failed to acknowledge the page. Recommendations: ban Friday deploys, and add
  disk alerts.
`;

evalite('Incident retro — the grounding judge fails an ungrounded, blaming retro', {
  data: [{ input: BAD_RETRO }],
  task: async (input) => {
    const verdict = await EffectEx.runPromise(judge(RETRO_RUBRIC, input));
    return { pass: verdict.pass };
  },
  scorers: [
    {
      name: 'judge-fails-the-bad-retro',
      description:
        'The rubric rejects a retro that recommends a deploy freeze, states the disk claim, and names a person.',
      scorer: ({ output }) => (output.pass ? 0 : 1),
    },
  ],
});
