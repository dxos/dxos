//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as Operation from '@dxos/compute/Operation';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';

import { composerAsides, threadPrompt } from '../testing/scripted.ts';
import { AnswerSupportTask, ListSupportTasks } from '../testing/support.ts';

const LIST_TASKS = Operation.toolName(ListSupportTasks);
const ANSWER_TASK = Operation.toolName(AnswerSupportTask);
const SESSION_DELEGATE = Operation.toolName(DelegationSkill.Operations.SessionDelegate);
const UPDATE_TASKS = Operation.toolName(PlanningSkill.Operations.UpdateTasks);
const CREATE_DOCUMENT = Operation.toolName(MarkdownOperation.Create);

/** What the reader asks the support agent once the inbox has run. */
export const SUPPORT_REQUEST = 'Work the open support tasks.';

/** What the agent says once both sessions are started; the story waits for it. */
export const SUPPORT_DELEGATED = 'Two sessions are answering the questions I can research';

/** Each question the agent hands to a session, as the pipeline titled its task. */
export const SUPPORT_SESSIONS = {
  hyperdrive: {
    title: 'Does Hyperdrive pool MySQL connections to an Aurora cluster?',
    purpose: 'Research Hyperdrive and Aurora',
    customer: 'Dara Singh',
    cites: 'Hyperdrive: MySQL connection pooling',
  },
  cron: {
    title: 'How do I test a Cron Trigger locally?',
    purpose: 'Retry the Cron Trigger question',
    customer: 'Eli Novak',
    cites: 'Cron Triggers: Local testing',
  },
} as const;

export type SupportSessionKey = keyof typeof SUPPORT_SESSIONS;

/** What each session says once its draft is written and its task done; the story waits for it. */
export const supportSessionDone = (key: SupportSessionKey) => `Drafted the reply to ${SUPPORT_SESSIONS[key].customer}`;

/** The document a research session writes, since no document in the space covers its question. */
export const HYPERDRIVE_DOCUMENT = {
  name: 'Hyperdrive',
  content: [
    '# Hyperdrive',
    '## MySQL connection pooling',
    'Hyperdrive keeps a pool of connections to your database and reuses them across requests, so a Worker does not open a new connection each time. It supports MySQL and PostgreSQL databases, including an Amazon Aurora cluster: create a Hyperdrive configuration with the connection string of the cluster and bind it to the Worker.',
    'Source: https://developers.cloudflare.com/hyperdrive/',
  ].join('\n\n'),
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A task's line in the list the support tool returns, capturing its URI as `key`. */
const taskLine = (key: SupportSessionKey) =>
  String.raw`${escapeRegExp(JSON.stringify(SUPPORT_SESSIONS[key].title))}:[^\n]*\(ref: (?<${key}>echo://[^)\s]+)\)`;

/** The open tasks as listed once every message has run, with the two the agent can research. */
const SUPPORT_TASKS = new RegExp(`${taskLine('hyperdrive')}[\\s\\S]*${taskLine('cron')}`);

/**
 * The support agent: reads the open tasks, keeps the requests and the question only the customer's logs answer for
 * people, and hands each question it can research to a session of its own.
 */
const agent = ScriptedScene.conversation('support agent', [
  ScriptedScene.turn('user', SUPPORT_REQUEST),
  ScriptedScene.turn(
    'assistant',
    [ScriptedScene.text('Reading the open support tasks.'), ScriptedScene.toolCall(LIST_TASKS, {})],
    { delay: '1200 millis' },
  ),
  ScriptedScene.turn('tool', SUPPORT_TASKS),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        "Six open tasks. Three are requests that change a customer's account: those stay with a person. Chen's deploy error needs their build logs, which I cannot read. Dara's Hyperdrive question has no document at all, so it needs research. Eli's Cron Trigger question failed only because the search timed out, so it is worth a retry.",
      ),
      ScriptedScene.text('Handing the Hyperdrive question to a research session.'),
      ScriptedScene.toolCall(SESSION_DELEGATE, {
        task: ScriptedScene.capture('hyperdrive'),
        purpose: SUPPORT_SESSIONS.hyperdrive.purpose,
      }),
    ],
    { delay: '2 seconds' },
  ),
  ScriptedScene.turn('tool', `Started session ${ScriptedScene.objectId('hyperdriveSession')}`),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('Handing the Cron Trigger question to a second session.'),
      ScriptedScene.toolCall(SESSION_DELEGATE, {
        task: ScriptedScene.capture('cron'),
        purpose: SUPPORT_SESSIONS.cron.purpose,
      }),
    ],
    { delay: '1200 millis' },
  ),
  ScriptedScene.turn('tool', `Started session ${ScriptedScene.objectId('cronSession')}`),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        `${SUPPORT_DELEGATED}: Dara's Hyperdrive question and Eli's Cron Trigger question. The three account requests and Chen's deploy error stay with the team, since they need someone who can change the account or read the logs.`,
      ),
    ],
    { delay: '1200 millis' },
  ),
]);

/** The prompt a delegated session opens on, capturing its task's URI. */
const assigned = (key: SupportSessionKey) =>
  new RegExp(
    String.raw`You have been assigned the task below\.\s+- ${escapeRegExp(JSON.stringify(SUPPORT_SESSIONS[key].title))}: (?<task>echo://[^\s)]+)`,
  );

const answered = (key: SupportSessionKey) => new RegExp(`citing ${escapeRegExp(SUPPORT_SESSIONS[key].cites)}`);

/** Marks the session's task done, then reports. */
const finish = (key: SupportSessionKey) => [
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('Marking the task done.'),
      ScriptedScene.toolCall(UPDATE_TASKS, { changes: [{ task: ScriptedScene.capture('task'), status: 'done' }] }),
    ],
    { delay: '800 millis' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        `${supportSessionDone(key)}, citing **${SUPPORT_SESSIONS[key].cites}**. It is in the drafts for a person to review and send.`,
      ),
    ],
    { delay: '800 millis' },
  ),
];

/** No document covers Hyperdrive: the session writes one, then answers from it as the pipeline would. */
const hyperdrive = ScriptedScene.conversation('hyperdrive session', [
  ScriptedScene.turn('user', assigned('hyperdrive')),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'No canonical document is about Hyperdrive, so the pipeline had nothing to cite. Hyperdrive pools connections to MySQL and PostgreSQL databases, Aurora included. Writing that down as a document answers this question and the next one like it.',
      ),
      ScriptedScene.text('Writing a Hyperdrive document, since the space has none.'),
      ScriptedScene.toolCall(CREATE_DOCUMENT, HYPERDRIVE_DOCUMENT),
    ],
    { delay: '2500 millis' },
  ),
  ScriptedScene.turn('tool', `"id":"${ScriptedScene.objectId('doc')}"`),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('Answering from the new document.'),
      ScriptedScene.toolCall(ANSWER_TASK, { task: ScriptedScene.capture('task') }),
    ],
    { delay: '1500 millis' },
  ),
  ScriptedScene.turn('tool', answered('hyperdrive')),
  ...finish('hyperdrive'),
]);

/** The search timed out the first time; the Cron Triggers document already answers the question. */
const cron = ScriptedScene.conversation('cron session', [
  ScriptedScene.turn('user', assigned('cron')),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'The pipeline made this task because its document search timed out, not because nothing answers it. The Cron Triggers document has a section on local testing, so a second search should find it.',
      ),
      ScriptedScene.text('Searching the documents again.'),
      ScriptedScene.toolCall(ANSWER_TASK, { task: ScriptedScene.capture('task') }),
    ],
    { delay: '3 seconds' },
  ),
  ScriptedScene.turn('tool', answered('cron')),
  ...finish('cron'),
]);

/** The support agent and the two sessions it hands questions to. */
export const supportAgent = ScriptedScene.make([agent, hyperdrive, cron], {
  asides: composerAsides,
  promptOf: threadPrompt,
});
