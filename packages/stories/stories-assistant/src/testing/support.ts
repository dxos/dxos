//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { SupportPipeline, TASK_SET_NAME, makeResearcher, makeResponder } from '@dxos/stories-support/testing';
import { Message, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

//
// A support agent that works the tasks the support pipeline leaves for people: it reads the open tasks, keeps the ones
// that need a person, and hands each question it can research to a session of its own. A session answers through the
// pipeline's own rule, so a draft it writes cites a document in the space just as the pipeline's drafts do.
//

/** The open tasks of the support task set, one line each, with the URI a delegation names. */
export const ListSupportTasks = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.support.listTasks'),
    name: 'List support tasks',
    description: trim`
      Lists the open tasks of the support inbox: questions the documents could not answer and requests that need
      someone to act. Each line gives the task's title, why it was made, who asked, and its URI.
    `,
    icon: 'ph--check-square-offset--regular',
  },
  input: Schema.Struct({}),
  output: Schema.String,
  services: [Database.Service],
});

/** Answers a support task's question from the space's documents, as the pipeline would have. */
export const AnswerSupportTask = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.support.answerTask'),
    name: 'Answer support task',
    description: trim`
      Searches the space's documents for the question of a support task and, when a section answers it, writes a
      draft reply to the customer that quotes and cites that section. Write the missing document first when no
      document covers the question; a document's title must name the product it is about.
    `,
    icon: 'ph--pencil-simple-line--regular',
  },
  input: Schema.Struct({
    task: Ref.Ref(Task.Task).annotate({ description: 'The task to answer: its `echo://` URI, as a plain string.' }),
  }),
  output: Schema.String,
  services: [Database.Service],
});

/** The support task set's open tasks, in the order they were made. */
const openTasks = Effect.gen(function* () {
  const sets = yield* Database.query(Filter.type(TaskSet.TaskSet)).run;
  const set = sets.find((candidate) => candidate.name === TASK_SET_NAME);
  if (!set) {
    return [];
  }
  const tasks = yield* Effect.forEach(set.tasks, (ref) => Database.load(ref).pipe(Effect.orDie));
  return tasks.filter((task) => task.status !== 'done');
});

/** The message a task was made from, read from the support mailbox's feed. */
const messageOf = (task: Task.Task) =>
  Effect.gen(function* () {
    const id = Obj.getMeta(task).keys.find((key) => key.source === SupportPipeline.MESSAGE_KEY_SOURCE)?.id;
    const [mailbox] = yield* Database.query(Filter.type(Mailbox.Mailbox)).run;
    if (!id || !mailbox) {
      return yield* Effect.die(new Error(`Task "${task.title}" names no message.`));
    }
    const feed = yield* Database.load(mailbox.feed).pipe(Effect.orDie);
    const messages = yield* Database.query(
      Query.select(Filter.type(Message.Message)).from(Scope.feed(Obj.getURI(feed))),
    ).run;
    const message = messages.find((candidate) => candidate.id === id);
    if (!message) {
      return yield* Effect.die(new Error(`No message ${id} in the support mailbox.`));
    }
    return { mailbox, message };
  });

export const SupportHandlers = OperationHandlerSet.make(
  ListSupportTasks.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        const tasks = yield* openTasks;
        if (tasks.length === 0) {
          return 'No open support tasks.';
        }
        // The description's first line is why the task was made, its second who asked.
        return tasks
          .map((task) => {
            const [reason = '', , from = ''] = task.description?.split('\n') ?? [];
            return `- [${task.status}] ${JSON.stringify(task.title)}: ${reason} ${from} (ref: ${Obj.getURI(task)})`;
          })
          .join('\n');
      }),
    ),
  ),
  AnswerSupportTask.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ task: taskRef }) {
        const loaded = yield* Database.load(taskRef).pipe(Effect.orDie);
        if (!Obj.instanceOf(Task.Task, loaded)) {
          return yield* Effect.die(new Error('The reference names no task.'));
        }
        const task = loaded;
        const { mailbox, message } = yield* messageOf(task);
        const { db } = yield* Database.Service;
        const sender = { email: message.sender.email ?? '', name: message.sender.name };
        const subject = String(message.properties?.subject ?? task.title);
        const { evidence } = yield* makeResearcher({ db })
          .research({ question: task.title, context: Message.extractText(message) })
          .pipe(Effect.orDie);
        const { decision, draft } = yield* makeResponder({ db })
          .respond({
            mailbox: Obj.getURI(mailbox),
            message: { id: message.id, subject, created: message.created, threadId: message.threadId, sender },
            question: task.title,
            evidence,
          })
          .pipe(Effect.orDie);
        if (decision.kind === 'task') {
          return `No document answers the question (${decision.reason}, confidence ${decision.confidence.toFixed(2)}); no draft was written.`;
        }
        const [{ title, heading }] = decision.citations;
        return `Drafted a reply to ${sender.name ?? sender.email}, citing ${title}: ${heading} (confidence ${decision.confidence.toFixed(2)}): ${draft}`;
      }),
    ),
  ),
);

export const SUPPORT_SKILL_KEY = 'com.example.skill.support';

const makeSupportSkill = () =>
  Skill.make({
    key: SUPPORT_SKILL_KEY,
    name: 'Support',
    description: 'Works the tasks the support inbox leaves for people.',
    tools: Skill.toolDefinitions({ operations: [ListSupportTasks, AnswerSupportTask] }),
    instructions: Template.make({
      source: trim`
        {{! Support }}

        You work the support inbox's open tasks. A request changes a customer's account and stays with a person; so
        does a question only the customer's own logs could answer. Hand every other question to a session of its own
        with the delegation tool. A session answers its task with answer-support-task; when no document covers the
        question it writes the document first, then answers, then marks its task done.
      `,
    }),
  });

export const SupportSkill: Skill.Definition = { key: SUPPORT_SKILL_KEY, make: makeSupportSkill };

/** Contributes the support skill and its operations. */
export const SupportAgentPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('com.example.plugin.supportAgent'), name: 'Support agent' }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.supportAgent.module.skill',
    activatesOn: ActivationEvents.Startup,
    provides: [AppCapabilities.SkillDefinition, Capabilities.OperationHandler],
    activate: () =>
      Effect.succeed([
        Capability.contribute(AppCapabilities.SkillDefinition, SupportSkill),
        Capability.contribute(Capabilities.OperationHandler, SupportHandlers),
      ]),
  }),
  Plugin.make,
);
