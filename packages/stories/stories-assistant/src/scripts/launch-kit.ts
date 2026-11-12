//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as Operation from '@dxos/compute/Operation';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';

/** One part of the launch: a task on the agent's checklist, handed to a subagent that writes one document. */
type LaunchTask = {
  /** Names its captures; letters only, since a RegExp group name must be an identifier. */
  readonly key: string;
  readonly title: string;
  /** What the agent hands the subagent; the subagent's thread opens with it. */
  readonly prompt: string;
  readonly document: string;
  readonly brief: string;
  readonly outline: string;
  readonly body: string;
  readonly review: string;
  /** Seconds each of the subagent's turns takes, so the threads finish at different times. */
  readonly pace: number;
};

export const LAUNCH_TASKS: readonly LaunchTask[] = [
  {
    key: 'blog',
    title: 'Blog post',
    prompt:
      'Draft the launch blog post for Composer 1.0: what it is, who it is for, and the three features to try first.',
    document: 'Launch blog post',
    brief: 'Readers are new to Composer. Lead with the problem it solves before naming any feature.',
    outline: '# Composer 1.0\n\n## Why\n\n## Three things to try first\n',
    body: [
      'Your documents, tables and agents in one local-first workspace.',
      '',
      '1. **Spaces** that sync between your devices and your team.',
      '2. **Agents** that work on the same objects you do.',
      '3. **Plugins** that turn a space into a tool for your job.',
    ].join('\n'),
    review: 'Three features, one example each, under 300 words. Good to hand back.',
    pace: 5,
  },
  {
    key: 'notes',
    title: 'Release notes',
    prompt: 'Write the release notes for Composer 1.0, grouped into new features, improvements and fixes.',
    document: 'Release notes 1.0',
    brief: 'Release notes are scanned, not read: one change per line, grouped so each reader finds their part.',
    outline: '# Release notes · 1.0\n\n## New\n## Improved\n## Fixed\n',
    body: [
      '- New: parallel agent threads, each in a column of its own.',
      '- Improved: spaces open twice as fast.',
      '- Fixed: comments keep their position after an edit.',
    ].join('\n'),
    review: 'Every line is one change and starts with its group. Done.',
    pace: 6,
  },
  {
    key: 'faq',
    title: 'FAQ',
    prompt: 'Draft an FAQ for the launch page that answers the questions new users ask most.',
    document: 'Launch FAQ',
    brief: 'The first question is always where the data lives, so that one goes first.',
    outline: '# FAQ\n',
    body: [
      '**Where is my data?** On your devices first; it syncs through EDGE when you share.',
      '',
      '**Does it work offline?** Yes. Changes merge when you reconnect.',
      '',
      '**Can agents see everything?** Only the spaces you give them.',
    ].join('\n'),
    review: 'Each answer is two sentences at most. The privacy answer is first, as planned.',
    pace: 7,
  },
  {
    key: 'email',
    title: 'Announcement email',
    prompt: 'Write the announcement email to existing users, under 150 words, with one call to action.',
    document: 'Announcement email',
    brief: 'Existing users already know Composer; tell them what changed and give them one link.',
    outline: '# Composer 1.0 is here\n\nHi there,\n',
    body: [
      'Composer 1.0 lets agents work beside you, each on its own task, in the same space.',
      '',
      '**[Open Composer](https://composer.space)** and try it on your next project.',
    ].join('\n'),
    review: 'Under 150 words with a single link. Ready.',
    pace: 5.5,
  },
];

/** What the reader types: one request too large for a single thread. */
export const LAUNCH_REQUEST =
  'Plan the Composer 1.0 launch: we need a blog post, release notes, an FAQ and an announcement email.';

/** Sent while the subagents work, to show the agent keeps talking. */
export const SIDE_QUESTION = 'While they work: which day should we launch?';

const UPDATE_TASKS = Operation.toolName(PlanningSkill.Operations.UpdateTasks);
const CREATE_DOCUMENT = Operation.toolName(MarkdownOperation.Create);
const UPDATE_DOCUMENT = Operation.toolName(MarkdownOperation.Update);
const CHECKPOINT_DOCUMENT = Operation.toolName(MarkdownOperation.CreateCheckpoint);

/** The checklist update-tasks returns, with each task's URI captured under its key. */
const CHECKLIST = new RegExp(
  LAUNCH_TASKS.map(({ key, title }) => String.raw`\] ${title}\s+ref: \[[^\]]*\]\((?<${key}>echo://[^)\s]+)\)`).join(
    String.raw`[\s\S]*?`,
  ),
);

/** The agent: plans the work, delegates one task per turn, then waits for each subagent and checks its task off. */
const agent = ScriptedScene.conversation('agent', [
  ScriptedScene.turn('user', LAUNCH_REQUEST),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'Four documents with no dependencies between them: each can go to a subagent of its own.',
      ),
      ScriptedScene.text('I will split this into four tasks and hand each one to a subagent.'),
      ScriptedScene.toolCall(UPDATE_TASKS, { changes: LAUNCH_TASKS.map(({ title }) => ({ create: true, title })) }),
    ],
    { delay: '1500 millis' },
  ),
  ScriptedScene.turn('tool', CHECKLIST),

  ...LAUNCH_TASKS.flatMap(({ key, title, prompt }) => [
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.text(`Delegating the ${title.toLowerCase()}.`),
        ScriptedScene.toolCall(UPDATE_TASKS, { changes: [{ task: ScriptedScene.capture(key), status: 'started' }] }),
        ScriptedScene.toolCall('thread_delegate', { task: prompt, purpose: title }),
      ],
      { delay: '1200 millis' },
    ),
    ScriptedScene.turn('tool', `Started subagent thread ${ScriptedScene.threadId(`${key}Thread`)} ("${title}")`),
  ]),

  // Waits in order; each turn checks off the task whose subagent just reported.
  ...LAUNCH_TASKS.map(({ key }, index) =>
    ScriptedScene.turn('assistant', [
      ...(index > 0
        ? [
            ScriptedScene.toolCall(UPDATE_TASKS, {
              changes: [{ task: ScriptedScene.capture(LAUNCH_TASKS[index - 1].key), status: 'done' }],
            }),
          ]
        : []),
      ScriptedScene.toolCall('thread_wait', { thread: ScriptedScene.threadId(`${key}Thread`) }),
    ]),
  ),
  ScriptedScene.turn('assistant', [
    ScriptedScene.text('Every subagent has reported.'),
    ScriptedScene.toolCall(UPDATE_TASKS, {
      changes: [{ task: ScriptedScene.capture(LAUNCH_TASKS[LAUNCH_TASKS.length - 1].key), status: 'done' }],
    }),
  ]),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        [
          'The launch kit is ready:',
          '',
          ...LAUNCH_TASKS.map(({ title, document }) => `- **${title}:** ${document}`),
          '',
          'Each document has a checkpoint named "Ready for review", so you can compare any later edit against it.',
        ].join('\n'),
      ),
    ],
    { delay: '1200 millis' },
  ),
]);

/** A subagent thinks aloud at each step: outline, fill in, check its work, then report with the document. */
const subagent = ({ title, prompt, document, brief, outline, body, review, pace }: LaunchTask) =>
  ScriptedScene.conversation(title, [
    ScriptedScene.turn('user', prompt),
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
      [ScriptedScene.text(`Wrote **${document}**.\n\n![${document}](${ScriptedScene.objectId('doc')})`)],
      { delay: '600 millis' },
    ),
  ]);

/** A question the reader sends mid-run, answered at once in a light thread. */
const sideQuestion = ScriptedScene.conversation('side question', [
  ScriptedScene.turn('user', 'which day should we launch'),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        'Tuesday the 18th: midweek launches get the most attention, and it leaves Monday for a last check of the documents.',
      ),
    ],
    { delay: '1200 millis' },
  ),
]);

/** The launch kit: an agent splits a request into four tasks, each written by a subagent in a thread of its own. */
export const launchKit = ScriptedScene.make([agent, ...LAUNCH_TASKS.map(subagent), sideQuestion]);
