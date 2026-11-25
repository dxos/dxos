//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as DelegationSkill from '@dxos/assistant-toolkit/DelegationSkill';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as Operation from '@dxos/compute/Operation';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';

import { composerAsides, threadPrompt } from '../testing/scripted.ts';
import { LAUNCH_CHECKLIST, LAUNCH_REQUEST, LAUNCH_TASKS, type LaunchTask, launchSideQuestion } from './launch-kit.ts';

const UPDATE_TASKS = Operation.toolName(PlanningSkill.Operations.UpdateTasks);
const SESSION_DELEGATE = Operation.toolName(DelegationSkill.Operations.SessionDelegate);

/** The first line of the prompt `Agent.delegate` opens a delegated session with; each session's script matches on it. */
const SESSION_OPENING_PROMPT = 'You have been assigned the task below.';
const CREATE_DOCUMENT = Operation.toolName(MarkdownOperation.Create);
const UPDATE_DOCUMENT = Operation.toolName(MarkdownOperation.Update);
const CHECKPOINT_DOCUMENT = Operation.toolName(MarkdownOperation.CreateCheckpoint);

/** What the agent says once every task has a session; the story waits for it. */
export const SESSIONS_STARTED = 'Four sessions are working on the launch kit';

/**
 * The agent: reads the project's tasks off its checklist, hands each to a session of its own, and leaves the sessions
 * to it. The project already holds the tasks (the story seeds them), so the agent plans nothing itself.
 */
const agent = ScriptedScene.conversation('agent', [
  ScriptedScene.turn('user', LAUNCH_REQUEST),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'The project already lists four documents with no dependencies between them: each can go to a session with an agent of its own.',
      ),
      ScriptedScene.text("I will check the project's tasks and start a session for each one."),
      // No changes: update-tasks answers with the checklist, which is where each task's URI comes from.
      ScriptedScene.toolCall(UPDATE_TASKS, { changes: [] }),
    ],
    { delay: '1500 millis' },
  ),
  ScriptedScene.turn('tool', LAUNCH_CHECKLIST),

  ...LAUNCH_TASKS.flatMap(({ key, title }) => [
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.text(`Starting a session for the ${title.toLowerCase()}.`),
        ScriptedScene.toolCall(SESSION_DELEGATE, { task: ScriptedScene.capture(key), purpose: title }),
      ],
      { delay: '1200 millis' },
    ),
    ScriptedScene.turn('tool', `Started session ${ScriptedScene.objectId(`${key}Session`)}`),
  ]),

  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        `${SESSIONS_STARTED}, one per document. Each session ticks its task off the checklist once its document is written.`,
      ),
    ],
    { delay: '1200 millis' },
  ),
]);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A delegated session: opens on the prompt naming its task, writes the document as a subagent does in the threads
 * scenario (outline, fill in, checkpoint), then ticks its task off.
 */
const session = ({ title, document, brief, outline, body, review, pace }: LaunchTask) =>
  ScriptedScene.conversation(`${title} session`, [
    ScriptedScene.turn(
      'user',
      new RegExp(
        String.raw`${escapeRegExp(SESSION_OPENING_PROMPT)}\s+- "${escapeRegExp(title)}": (?<task>echo://[^\s)]+)`,
      ),
    ),
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.reasoning(brief),
        ScriptedScene.text('Outline first, so the structure is settled before any wording.'),
        ScriptedScene.toolCall(CREATE_DOCUMENT, { name: document, content: outline }),
      ],
      { delay: `${pace} seconds` },
    ),
    ScriptedScene.turn('tool', `"id":"${ScriptedScene.objectId('doc')}"`),
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.reasoning('The outline holds. Each section needs one concrete line, nothing more.'),
        ScriptedScene.text('Filling in the sections.'),
        ScriptedScene.toolCall(UPDATE_DOCUMENT, {
          doc: ScriptedScene.objectId('doc'),
          edits: [{ newString: `\n${body}\n` }],
        }),
      ],
      { delay: `${pace} seconds` },
    ),
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.reasoning(review),
        ScriptedScene.text('Saving a checkpoint for review.'),
        ScriptedScene.toolCall(CHECKPOINT_DOCUMENT, { doc: ScriptedScene.objectId('doc'), name: 'Ready for review' }),
      ],
      { delay: `${pace / 2} seconds` },
    ),
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.text('Marking the task done.'),
        ScriptedScene.toolCall(UPDATE_TASKS, { changes: [{ task: ScriptedScene.capture('task'), status: 'done' }] }),
      ],
      { delay: '600 millis' },
    ),
    ScriptedScene.turn(
      'assistant',
      [ScriptedScene.text(`Wrote **${document}**.\n\n![${document}](${ScriptedScene.objectId('doc')})`)],
      { delay: '600 millis' },
    ),
  ]);

/** The launch kit, delegated to sessions: an agent splits the request into four tasks and starts a session for each. */
export const launchKitSessions = ScriptedScene.make([agent, ...LAUNCH_TASKS.map(session), launchSideQuestion], {
  asides: composerAsides,
  promptOf: threadPrompt,
});
