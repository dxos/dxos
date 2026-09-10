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

import { findObject, toolInvocations } from '../assertions';
import { judge } from '../judge';
import { createEvalRunner } from '../runner';
import { getDefaultSkills } from '../skills';

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
  dbQuery: () =>
    Effect.gen(function* () {
      const invocations = yield* toolInvocations();
      const trace = {
        artifactAddCalled: invocations.some(({ name }) => name === 'projects-add-artifact'),
        taskCreateCalled: invocations.some(({ name }) => name === 'tasks-create'),
        erroredTools: invocations.filter(({ error }) => error).map(({ name }) => name),
      };
      const empty = {
        ...trace,
        timelineTimes: 0,
        timelineDiskHandled: false,
        retroFiled: false,
        retroNamesCertificate: false,
        retroNamesRoutingGap: false,
        retroNamesRenewalGap: false,
        retroJudge: undefined as { pass: boolean; reasoning: string } | undefined,
        actionItems: 0,
        actionItemsOwned: 0,
        actionItemRouting: false,
        actionItemRenewal: false,
        actionItemsClean: false,
        distractorItems: [] as string[],
        noticeFiled: false,
        noticeNamesCertificate: false,
        noticeClean: false,
        delegatedInReview: 0,
        delegatedTotal: 4,
      };

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
      if (!project || !taskSet) {
        return empty;
      }

      // The documents filed on the project, by the name each task asked for.
      const artifacts = yield* Effect.forEach(project.artifacts, (ref) =>
        Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
      );
      const documents = artifacts.filter((candidate): candidate is Markdown.Document =>
        Obj.instanceOf(Markdown.Document, candidate),
      );
      const textOf = (document: Markdown.Document | undefined) =>
        document
          ? Database.load(document.content).pipe(
              Effect.map((text) => text.content),
              Effect.orElseSucceed(() => ''),
            )
          : Effect.succeed('');
      const named = (needle: RegExp) => documents.find((document) => needle.test(document.name ?? ''));
      const timeline = yield* textOf(named(/timeline/i));
      const retro = yield* textOf(named(/retro/i));
      const notice = yield* textOf(named(/notice|customer/i));

      // The disk claim may appear, but only as a claim: something the record does not bear out.
      const timelineDiskHandled =
        !/disk/i.test(timeline) ||
        /second.?hand|unverified|not (?:supported|borne out|confirmed)|contradict|rules? (?:this |it )?out|no evidence|held at 41/i.test(
          timeline,
        );

      const retroJudge = retro
        ? yield* judge(RETRO_RUBRIC, retro).pipe(Effect.orElseSucceed(() => undefined))
        : undefined;

      // Action items: the tasks the session added to the set beyond the four it was given.
      const allTasks = yield* Effect.forEach(taskSet.tasks, (ref) =>
        Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
      );
      const delegated = allTasks.filter((candidate) => candidate?.assignee?.role === 'assistant');
      const created = allTasks.filter(
        (candidate): candidate is Task.Task => !!candidate && candidate.assignee?.role !== 'assistant',
      );
      const ownedBy = (candidate: Task.Task) =>
        CAST.some((name) => lower(candidate.assignee?.name).includes(lower(name)));
      const about = (candidate: Task.Task, needle: RegExp) =>
        needle.test(`${candidate.title ?? ''} ${candidate.description ?? ''}`);
      const distractorItems = created
        .filter((candidate) => DISTRACTOR_ACTIONS.test(candidate.title ?? ''))
        .map((candidate) => candidate.title ?? '');

      return {
        ...trace,
        timelineTimes: LOG_TIMES.filter((time) => timeline.includes(time)).length,
        timelineDiskHandled,
        retroFiled: retro.length > 0,
        retroNamesCertificate: /certificate/i.test(retro),
        retroNamesRoutingGap: ROUTING_GAP.test(retro),
        retroNamesRenewalGap: RENEWAL_GAP.test(retro),
        retroJudge,
        actionItems: created.length,
        actionItemsOwned: created.filter(ownedBy).length,
        actionItemRouting: created.some((candidate) => about(candidate, ROUTING_GAP)),
        actionItemRenewal: created.some((candidate) => about(candidate, RENEWAL_GAP)),
        actionItemsClean: distractorItems.length === 0,
        distractorItems,
        noticeFiled: notice.length > 0,
        noticeNamesCertificate: /certificate/i.test(notice),
        noticeClean: notice.length > 0 && !INTERNAL.test(notice),
        // `done` past a named reviewer lands as `review`; either means the session finished the task.
        delegatedInReview: delegated.filter(
          (candidate) => candidate?.status === 'review' || candidate?.status === 'done',
        ).length,
        delegatedTotal: delegated.length,
      };
    }),
});

evalite('Incident retro — a delegated session turns a log and four notes into a filed retro', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'timeline-follows-the-log',
      description: 'A Timeline artifact carries the four times the log fixes.',
      scorer: ({ output }) => output.dbQuery.timelineTimes / LOG_TIMES.length,
    },
    {
      name: 'timeline-holds-the-disk-claim-as-a-claim',
      description: 'The second-hand disk claim is absent from the timeline, or marked as unsupported by the log.',
      scorer: ({ output }) => (output.dbQuery.timelineDiskHandled ? 1 : 0),
    },
    {
      name: 'retro-names-the-cause',
      description: 'A Retrospective artifact is filed and names the expired certificate.',
      scorer: ({ output }) => (output.dbQuery.retroFiled && output.dbQuery.retroNamesCertificate ? 1 : 0),
    },
    {
      name: 'retro-finds-both-process-gaps',
      description: 'The retrospective names the stale alert routing and the unowned renewal.',
      scorer: ({ output }) =>
        [output.dbQuery.retroNamesRoutingGap, output.dbQuery.retroNamesRenewalGap].filter(Boolean).length / 2,
    },
    {
      name: 'retro-grounded-and-blameless',
      description: 'Judge: no deploy freeze, the disk claim not stated as fact, no named person blamed.',
      scorer: ({ output }) => (output.dbQuery.retroJudge?.pass ? 1 : 0),
    },
    {
      name: 'action-items-are-owned-tasks',
      description: "At least two new tasks on the project's set, each assigned to someone from the notes.",
      scorer: ({ output }) =>
        output.dbQuery.actionItems >= 2 ? output.dbQuery.actionItemsOwned / output.dbQuery.actionItems : 0,
    },
    {
      name: 'action-items-follow-the-evidence',
      description: 'One item on alert routing, one on renewal ownership, none on deploys or disk.',
      scorer: ({ output }) =>
        [output.dbQuery.actionItemRouting, output.dbQuery.actionItemRenewal, output.dbQuery.actionItemsClean].filter(
          Boolean,
        ).length / 3,
    },
    {
      name: 'customer-notice-is-plain',
      description: 'A Customer notice artifact names the certificate and carries no internal names or systems.',
      scorer: ({ output }) =>
        output.dbQuery.noticeFiled && output.dbQuery.noticeNamesCertificate && output.dbQuery.noticeClean ? 1 : 0,
    },
    {
      name: 'delegated-tasks-back-in-review',
      description: 'Every task the session was given is in review (or done) when it finishes.',
      scorer: ({ output }) =>
        output.dbQuery.delegatedTotal > 0 ? output.dbQuery.delegatedInReview / output.dbQuery.delegatedTotal : 0,
    },
    {
      name: 'project-verbs-reached',
      description: 'Artifacts were filed and tasks created through the project skill, and no tool errored.',
      scorer: ({ output }) =>
        output.dbQuery.artifactAddCalled && output.dbQuery.taskCreateCalled && output.dbQuery.erroredTools.length === 0
          ? 1
          : 0,
    },
  ],
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
