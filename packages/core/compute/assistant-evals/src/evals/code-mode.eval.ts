//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { PlainDialect, makeCodeModeTurnProducer } from '@dxos/agent-code-mode';
import { type MakeTurnProducer } from '@dxos/agent-runtime';
import { Model } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/compute/Agent';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { getTextInAnchorRange, toCursor } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { type DXN, EntityId, URI } from '@dxos/keys';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';
import { SheetSkill } from '@dxos/plugin-sheet/skills';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Selection } from '@dxos/react-ui-attention/types';
import { Milestone, Organization, Person, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import { completedBlocks, findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

/**
 * Code mode across a spread of database work, one engine and model per variant.
 *
 * The point is the comparison, not any single score: every task runs on DXOS's own tool-calling
 * `AiSession` and on both code-mode dialects, on each model, with the same skills, prompt and
 * scorers, so a column that only fails on one engine or one model is evidence about that engine or
 * model rather than about the task.
 */
const ENGINES: { name: string; makeTurnProducer?: MakeTurnProducer }[] = [
  // No producer: the default `AiSession`, where every action is its own tool call.
  { name: 'tools' },
  // The default dialect, as Composer runs it.
  { name: 'code-mode-effect', makeTurnProducer: makeCodeModeTurnProducer() },
  { name: 'code-mode-plain', makeTurnProducer: makeCodeModeTurnProducer({ dialect: PlainDialect }) },
];

/**
 * Opus goes to Anthropic directly and needs `DX_ANTHROPIC_API_KEY`; DeepSeek is served through EDGE
 * with the run's own identity, as the app serves it.
 */
const MODELS: { name: string; model: DXN.DXN }[] = [Model.claudeOpus5, Model.deepseekV4Pro].map((model) => ({
  name: model.backend,
  model: model.id,
}));

/** A comma-separated filter from the environment; unset or empty keeps everything. */
const filterFromEnv = (variable: string): ((name: string) => boolean) => {
  const value = process.env[variable]?.trim() ?? '';
  const selected = value ? value.split(',').map((name) => name.trim()) : [];
  return (name) => selected.length === 0 || selected.includes(name);
};

/** `DX_EVAL_ENGINES` and `DX_EVAL_MODELS` narrow the matrix, each comma-separated. */
const engineSelected = filterFromEnv('DX_EVAL_ENGINES');
const modelSelected = filterFromEnv('DX_EVAL_MODELS');

const VARIANTS = ENGINES.filter(({ name }) => engineSelected(name)).flatMap((engine) =>
  MODELS.filter(({ name }) => modelSelected(name)).map(({ name, model }) => ({
    name: `${engine.name} / ${name}`,
    input: {
      model,
      name: `${engine.name} / ${name}`,
      ...(engine.makeTurnProducer ? { makeTurnProducer: engine.makeTurnProducer } : {}),
    },
  })),
);

/** Code mode reaches an operation by writing a loop around it, so several turns is normal. */
const TIMEOUT = 150_000;

/** Organizations every task starts from, so a task is about the work and not about seeding. */
const SEEDED = [
  { name: 'Acme Robotics', status: 'active' as const },
  { name: 'Acme Logistics', status: 'prospect' as const },
  { name: 'Initech', status: 'active' as const },
  { name: 'Globex', status: 'reject' as const },
];

const seedOrganizations = () =>
  Effect.gen(function* () {
    for (const organization of SEEDED) {
      yield* Database.add(Obj.make(Organization.Organization, organization));
    }
    yield* Database.flush();
    return {};
  });

const organizations = Query.select(Filter.type(Organization.Organization));

/** Whether the seeded organizations are present and unchanged — the check a read-only task has to pass. */
const matchesSeed = (results: readonly Organization.Organization[]): boolean =>
  results.length === SEEDED.length &&
  SEEDED.every((seeded) =>
    results.some(
      (organization) =>
        organization.name === seeded.name &&
        organization.status === seeded.status &&
        organization.website === undefined,
    ),
  );

/** The assistant's own words this run, which is where a reported count has to appear. */
const assistantText = Scorer.shared(
  completedBlocks().pipe(
    Effect.map((blocks) =>
      blocks
        .filter(({ role, block }) => role === 'assistant' && block._tag === 'text')
        .map(({ block }) => (block._tag === 'text' ? block.text : ''))
        .join('\n'),
    ),
  ),
);

type RunnerOptions = Parameters<typeof createEvalRunner>[0];

/**
 * The object id a ref points at: its URI's last path segment. The URI's shape is not ours to predict —
 * an agent writes whichever form it writes (`echo:<id>`, say), which `Database.load` rejects as an
 * unsupported URI kind and `EID.tryParse` cannot read — and the last segment keeps a space id from
 * standing in for an object's.
 */
const refTarget = (ref: Ref.Ref<unknown>): string | undefined => String(ref.uri).split(/[:/]/).filter(Boolean).at(-1);

/**
 * One task, run on every engine in the matrix. Declared as a function so each task's scorers are
 * written against its own outcome rather than switched on at grading time.
 */
const defineTask = ({
  title,
  instructions,
  scorers,
  seed,
  skills,
  plugins,
  types = [],
  turns = { target: 3, budget: 15 },
}: {
  title: string;
  instructions: string;
  scorers: Scorer.Any[];
  seed?: RunnerOptions['seed'];
  skills?: RunnerOptions['skills'];
  plugins?: RunnerOptions['plugins'];
  /** ECHO types beyond the organizations and people every task registers. */
  types?: NonNullable<RunnerOptions['types']>;
  /** Model round trips the task should take, and the count at which it scores nothing. */
  turns?: { target: number; budget: number };
}) => {
  const task = createEvalRunner({
    name: `Code mode — ${title}`,
    instructions,
    input: Schema.Null,
    output: Schema.Unknown,
    types: [Organization.Organization, Person.Person, ...types],
    ...(skills ? { skills } : {}),
    ...(plugins ? { plugins } : {}),
    timeout: TIMEOUT,
    gradeIncomplete: true,
    scored: true,
    // Every engine, `tools` included, runs as an agent session, so the variants differ only in it.
    agentSession: true,
    ...(seed ? { seed } : {}),
  });

  evalite.each(VARIANTS)(`Code mode — ${title}`, {
    data: [{ input: null }],
    task,
    // The reply as text: evalite's reporter throws on wide characters (a Chinese reply) inside an
    // object it renders, and that throw fails the whole run.
    columns: ({ output }) => [
      {
        label: 'Reply',
        value: typeof output.agentOutput === 'string' ? output.agentOutput : JSON.stringify(output.agentOutput),
      },
      { label: 'Seconds', value: String(Math.round(output.durationMillis / 1_000)) },
    ],
    // Every task needs the workspace, so the share of its calls that worked, how many failed and how
    // many round trips it took are graded on all: the comparison across engines the matrix exists for.
    scorers: Scorer.toEvalite([
      ...scorers,
      Scorer.toolCallSuccess(),
      Scorer.failedCalls({ budget: 5 }),
      Scorer.turns(turns),
    ]),
  });
};

//
// 1. Writing: several objects from one instruction.
//

const CREATED = [
  { name: 'Stark Industries', status: 'active' },
  { name: 'Wayne Enterprises', status: 'prospect' },
  { name: 'Oscorp', status: 'reject' },
];

defineTask({
  title: 'creates several objects from one instruction',
  instructions: trim`
    The database starts empty.
    Create three organizations, with exactly these names and statuses:
    "Stark Industries" (active), "Wayne Enterprises" (prospect), "Oscorp" (reject).
  `,
  scorers: [
    Scorer.database({
      name: 'organizations-created',
      description: 'All three organizations exist with the requested status.',
      query: organizations,
      score: (results) => {
        const matched = CREATED.filter((want) =>
          results.some((organization) => organization.name === want.name && organization.status === want.status),
        );
        return matched.length / CREATED.length;
      },
    }),
    Scorer.database({
      name: 'nothing-extra-created',
      description: 'Exactly the three requested organizations exist — no duplicates, no extras.',
      query: organizations,
      // Graded apart from the names above: a run that creates all three AND three more has done the
      // task and then some, which is a different failure from having missed one.
      score: (results) => results.length === CREATED.length,
    }),
  ],
});

//
// 2. Reading: a question answered from the data, with nothing written.
//

defineTask({
  title: 'answers a question about the data without changing it',
  seed: seedOrganizations,
  instructions: trim`
    The database is already populated with organizations.
    How many of them have the status "active"? Reply with the number and the organizations' names.
    Do not create, change or delete anything.
  `,
  scorers: [
    Scorer.make({
      name: 'count-reported',
      description: 'The reply states the correct number of active organizations.',
      score: assistantText.pipe(Effect.map((text) => /\b(2|two)\b/i.test(text))),
    }),
    Scorer.make({
      name: 'names-reported',
      description: 'The reply names both active organizations.',
      score: assistantText.pipe(
        Effect.map((text) => ['Acme Robotics', 'Initech'].filter((name) => text.includes(name)).length / 2),
      ),
    }),
    Scorer.database({
      name: 'nothing-created',
      description: 'A read-only task created nothing: no people exist, since none were seeded.',
      query: Query.select(Filter.type(Person.Person)),
      score: (results) => results.length === 0,
    }),
    Scorer.database({
      name: 'nothing-written',
      description: 'A read-only task wrote nothing: the seeded organizations are untouched.',
      query: organizations,
      score: matchesSeed,
    }),
  ],
});

//
// 3. Reading then writing: a change to the subset a filter selects, and to nothing else.
//

defineTask({
  title: 'updates the subset a filter selects',
  seed: seedOrganizations,
  instructions: trim`
    The database is already populated with organizations.
    Set the website of every organization whose name starts with "Acme" to "https://acme.example.com".
    Leave every other organization exactly as it is.
  `,
  scorers: [
    Scorer.database({
      name: 'matching-updated',
      description: 'Both Acme organizations carry the new website.',
      query: organizations,
      score: (results) => {
        const acme = results.filter((organization) => organization.name?.startsWith('Acme'));
        const updated = acme.filter((organization) => organization.website === 'https://acme.example.com');
        return acme.length === 2 ? updated.length / 2 : 0;
      },
    }),
    Scorer.database({
      name: 'others-untouched',
      description: 'Every organization outside the filter is exactly as it was seeded.',
      query: organizations,
      score: (results) => {
        const others = results.filter((organization) => !organization.name?.startsWith('Acme'));
        const seededOthers = SEEDED.filter((seeded) => !seeded.name.startsWith('Acme'));
        return (
          others.length === seededOthers.length &&
          seededOthers.every((seeded) =>
            others.some(
              (organization) =>
                organization.name === seeded.name &&
                organization.status === seeded.status &&
                organization.website === undefined,
            ),
          )
        );
      },
    }),
  ],
});

//
// 4. Writing a reference: the object graph, not just fields.
//

defineTask({
  title: 'creates an object referencing another',
  seed: seedOrganizations,
  instructions: trim`
    The database is already populated with organizations.
    Create a person named "Ada Lovelace" whose job title is "CTO" and whose organization is the
    existing "Initech" organization. Link the person to that organization object, do not create a
    second one.
  `,
  scorers: [
    Scorer.database({
      name: 'person-created',
      description: 'A person named Ada Lovelace exists with the requested job title.',
      query: Query.select(Filter.type(Person.Person)),
      score: (results) => results.some((person) => person.fullName === 'Ada Lovelace' && person.jobTitle === 'CTO'),
    }),
    Scorer.make({
      name: 'organization-linked',
      description: "The person's organization ref points at the seeded Initech organization.",
      score: Effect.gen(function* () {
        const [people, organizations] = [
          yield* Database.query(Filter.type(Person.Person)).run,
          yield* Database.query(Filter.type(Organization.Organization)).run,
        ];
        const ada = people.find((person) => person.fullName === 'Ada Lovelace');
        const initech = organizations.find((organization) => organization.name === 'Initech');
        if (ada?.organization === undefined || initech === undefined) {
          return false;
        }
        return refTarget(ada.organization) === initech.id;
      }),
    }),
    Scorer.database({
      name: 'no-duplicate-organization',
      description: 'The existing organization was linked rather than a second one created.',
      query: organizations,
      score: (results) => results.filter((organization) => organization.name === 'Initech').length === 1,
    }),
  ],
});

//
// 5. Editing in place: the passage the user highlighted, and nothing else in the document.
//

const DOCUMENT_NAME = 'Sync design notes';

/** Names and figures a faithful translation keeps as written. */
const KEPT_TOKENS = ['ECHO', '2026'];

const PASSAGE =
  'Since the 2026 release, ECHO merges concurrent edits on every device without a central server, ' +
  'so two people can change the same document offline and both changes survive.';

/** The text around the highlighted passage, which has to survive byte for byte. */
const PREFIX = [
  '# Sync design notes',
  '',
  'Every device keeps a full replica of the space, so reads never wait on the network.',
  '',
  '',
].join('\n');
const SUFFIX = ['', '', 'Conflicts are rare in practice: most edits touch different paragraphs.', ''].join('\n');

const DOCUMENT_TEXT = `${PREFIX}${PASSAGE}${SUFFIX}`;

/** The document's final text, read back outside the agent. */
const translatedDocumentText = Scorer.shared(
  Effect.gen(function* () {
    const document = yield* findObject(Markdown.Document, (candidate) => candidate.name === DOCUMENT_NAME);
    return document ? (yield* Database.load(document.content)).content : undefined;
  }),
);

/** What stands where the passage stood, when the text around it is intact; `undefined` when it is not. */
const replacement = translatedDocumentText.pipe(
  Effect.map((text) =>
    text !== undefined &&
    text.length >= PREFIX.length + SUFFIX.length &&
    text.startsWith(PREFIX) &&
    text.endsWith(SUFFIX)
      ? text.slice(PREFIX.length, text.length - SUFFIX.length)
      : undefined,
  ),
);

const HAN = /\p{Script=Han}/gu;
const LATIN = /\p{Script=Latin}/gu;

defineTask({
  title: 'translates the highlighted passage in place',
  skills: () => [...getDefaultSkills(), Ref.make(MarkdownSkill.make())],
  plugins: [MarkdownPlugin.make()],
  turns: { target: 4, budget: 15 },
  seed: () =>
    Effect.gen(function* () {
      const document = yield* Database.add(Markdown.make({ name: DOCUMENT_NAME, content: DOCUMENT_TEXT }));
      yield* Database.flush();
      // A real cursor range over the passage, checked by resolving it the way the app's anchor resolver
      // does, so the request carries exactly what a highlight in the editor would.
      const accessor = Doc.createAccessor(yield* Database.load(document.content), ['content']);
      const from = toCursor(accessor, PREFIX.length);
      const to = toCursor(accessor, PREFIX.length + PASSAGE.length);
      const anchor = `${from}:${to}`;
      const selected = getTextInAnchorRange(accessor, anchor);
      if (selected !== PASSAGE) {
        return yield* Effect.die(new Error(`The selection resolved to the wrong text: ${selected}`));
      }
      // The editor's selection too, which `markdown.getSelection` reads: the skill tells the agent to ask for it, and
      // without one the call answers with no ranges, which no app session would.
      const [viewState] = (yield* Capability.Service).getAll(AttentionCapabilities.ViewState);
      if (viewState === undefined) {
        return yield* Effect.die(new Error('The harness has no view state to hold the selection.'));
      }
      viewState.set(Selection.aspect, Obj.getURI(document), { mode: 'range', from, to });
      return { objects: [Ref.make(document)], context: { selection: { anchors: [anchor], text: selected } } };
    }),
  instructions: trim`
    Translate the passage I highlighted into Simplified Chinese, replacing it in the document.
  `,
  scorers: [
    Scorer.make({
      name: 'passage-replaced',
      description: 'The highlighted English passage is gone from the document.',
      score: translatedDocumentText.pipe(Effect.map((text) => text !== undefined && !text.includes(PASSAGE))),
    }),
    Scorer.make({
      name: 'translated-to-chinese',
      description: "What stands in the passage's place is Chinese: most of its letters are Han characters.",
      score: replacement.pipe(
        Effect.map((middle) => {
          if (middle === undefined) {
            return false;
          }
          // The kept names stay Latin by design, so they do not count against the translation.
          const rest = KEPT_TOKENS.reduce((value, token) => value.replaceAll(token, ''), middle);
          const han = rest.match(HAN)?.length ?? 0;
          const latin = rest.match(LATIN)?.length ?? 0;
          return han > 0 && han / (han + latin) >= 0.8;
        }),
      ),
    }),
    Scorer.make({
      name: 'names-kept',
      description: 'The translation keeps the product name and the year as written.',
      score: replacement.pipe(
        Effect.map((middle) =>
          middle === undefined ? 0 : KEPT_TOKENS.filter((token) => middle.includes(token)).length / KEPT_TOKENS.length,
        ),
      ),
    }),
    Scorer.make({
      name: 'rest-untouched',
      description: 'The text before and after the passage is exactly as it was: only the highlight changed.',
      score: replacement.pipe(Effect.map((middle) => middle !== undefined)),
    }),
    Scorer.database({
      name: 'no-new-document',
      description: 'The passage was edited in place, not written into a second document.',
      query: Query.select(Filter.type(Markdown.Document)),
      score: (documents) => documents.length === 1,
    }),
  ],
});

//
// The tasks below come from real agent chats on EDGE: what users asked for, and where the agents
// struggled (refs passed as URI strings, a decoy picked, nothing persisting between `eval` calls).
//

const documents = Query.select(Filter.type(Markdown.Document));
const tasks = Query.select(Filter.type(Task.Task));

/** The text of the markdown document with `name`, read back outside the agent. */
const documentText = (name: string) =>
  Effect.gen(function* () {
    const document = yield* findObject(Markdown.Document, (candidate) => candidate.name === name);
    return document ? (yield* Database.load(document.content)).content : undefined;
  });

/** The tasks a named task set holds, in order. */
const taskSetTasks = (name: string) =>
  Effect.gen(function* () {
    const taskSet = yield* findObject(TaskSet.TaskSet, (candidate) => candidate.name === name);
    return taskSet ? yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref)) : undefined;
  });

const PROJECT_TYPES = [Project.Project, Milestone.Milestone, Task.Task, TaskSet.TaskSet];
const projectSkills = () => [...getDefaultSkills(), Ref.make(ProjectSkill.make())];
const projectPlugins = () => [ProjectsPlugin.make(), TasksPlugin.make(), MarkdownPlugin.make()];

//
// 6. Several writes across objects: two tasks closed, and the right document filed on one of them.
//

const LAUNCH_TASKS = [
  { title: 'Draft the brief', status: 'started' as const },
  { title: 'Collect quotes', status: 'todo' as const },
  { title: 'Book venue', status: 'todo' as const },
  { title: 'Send invites', status: 'backlog' as const },
];
const CLOSED = ['Draft the brief', 'Collect quotes'];
const BRIEF = 'Launch brief';

/** The launch tasks as the run left them, by title. */
const launchTasks = Scorer.shared(
  Database.query(Filter.type(Task.Task)).run.pipe(
    Effect.map((results) => new Map(results.map((task) => [task.title, task]))),
  ),
);

defineTask({
  title: 'closes tasks and files the right artifact',
  skills: projectSkills,
  plugins: projectPlugins(),
  types: PROJECT_TYPES,
  turns: { target: 4, budget: 15 },
  seed: () =>
    Effect.gen(function* () {
      const seeded = yield* Effect.forEach(LAUNCH_TASKS, (task) => Database.add(Task.make(task)));
      const taskSet = yield* Database.add(
        TaskSet.make({ name: 'Launch tasks', tasks: seeded.map((task) => Ref.make(task)) }),
      );
      const project = yield* Database.add(Project.make({ name: 'Launch', taskSet: Ref.make(taskSet) }));
      yield* Database.add(Markdown.make({ name: BRIEF, content: '# Launch brief\n\nWe launch in March.\n' }));
      yield* Database.add(
        Markdown.make({ name: `${BRIEF} (old)`, content: '# Launch brief\n\nWe launch in January.\n' }),
      );
      yield* Database.flush();
      return { objects: [Ref.make(project)] };
    }),
  instructions: trim`
    In the "Launch" project, mark "Draft the brief" and "Collect quotes" as done, and attach the
    "${BRIEF}" document to "Draft the brief" as its artifact. Leave the other tasks alone.
  `,
  scorers: [
    Scorer.make({
      name: 'named-tasks-done',
      description: 'Both named tasks are done.',
      score: launchTasks.pipe(
        Effect.map((byTitle) => CLOSED.filter((title) => byTitle.get(title)?.status === 'done').length / CLOSED.length),
      ),
    }),
    Scorer.make({
      name: 'right-artifact-filed',
      description: `"Draft the brief" holds exactly one artifact: the "${BRIEF}" document, not the old one.`,
      score: Effect.gen(function* () {
        const task = (yield* launchTasks).get('Draft the brief');
        const brief = yield* findObject(Markdown.Document, (candidate) => candidate.name === BRIEF);
        const artifacts = task?.artifacts ?? [];
        return brief !== undefined && artifacts.length === 1 && refTarget(artifacts[0]) === brief.id;
      }),
    }),
    Scorer.make({
      name: 'others-untouched',
      description: 'The tasks not named keep their status, and only "Draft the brief" holds an artifact.',
      score: launchTasks.pipe(
        Effect.map(
          (byTitle) =>
            LAUNCH_TASKS.every(
              ({ title, status }) =>
                CLOSED.includes(title) ||
                (byTitle.get(title)?.status === status && !byTitle.get(title)?.artifacts?.length),
            ) && !byTitle.get('Collect quotes')?.artifacts?.length,
        ),
      ),
    }),
    Scorer.database({
      name: 'nothing-created',
      description: 'No task or document was added: the existing ones were updated and filed.',
      query: tasks,
      score: (results) => results.length === LAUNCH_TASKS.length,
    }),
    Scorer.database({
      name: 'documents-kept',
      description: 'Both briefs are still there; neither was copied or removed.',
      query: documents,
      score: (results) => results.length === 2,
    }),
  ],
});

//
// 7. Many writes from one long read: a task per requirement in a long spec, and nothing else.
//

const SPEC_NAME = 'SyncService spec';
const SPEC_SET = 'Spec work';
const REQUIREMENTS = [
  'Replicas converge after a partition heals',
  'Writes are acknowledged only once durable',
  'A client resumes from its last cursor',
  'Deletes propagate as tombstones',
  'Snapshots are taken every thousand changes',
  'Large blobs are stored out of line',
  'Sync traffic is compressed',
  'Each space has its own rate limit',
  'Clock skew is tolerated up to five minutes',
  'Schema changes are versioned',
  'Conflicts are reported to the client',
  'Metrics are exported per space',
];
/** Headings in the spec that are not requirements, which a careless read turns into tasks too. */
const NOT_REQUIREMENTS = ['Glossary', 'Prior art'];
const OTHER_TASKS = ['Renew the certificate', 'Rotate the API keys'];

/** Long, varied prose, so the requirements sit far apart in a document of about 30,000 characters. */
const prose = (topic: string, paragraphs: number): string =>
  Array.from(
    { length: paragraphs },
    (_, index) =>
      `Paragraph ${index + 1} on ${topic.toLowerCase()}: the service keeps every replica's history so a ` +
      'peer that was offline can catch up without a full reload, and the operators who run it need to ' +
      'understand what happens to in-flight writes when a node restarts, which this section explains in ' +
      'terms of the guarantees a client can rely on and the ones it cannot.',
  ).join('\n\n');

const SPEC_TEXT = [
  `# ${SPEC_NAME}`,
  '## Background',
  prose('background', 12),
  '## Requirements',
  ...REQUIREMENTS.flatMap((requirement) => [`### ${requirement}`, prose(requirement, 4)]),
  '## Appendix',
  ...NOT_REQUIREMENTS.flatMap((heading) => [`### ${heading}`, prose(heading, 6)]),
  '',
].join('\n\n');

defineTask({
  title: 'files a task for every requirement in a long document',
  skills: projectSkills,
  plugins: projectPlugins(),
  types: PROJECT_TYPES,
  turns: { target: 4, budget: 20 },
  seed: () =>
    Effect.gen(function* () {
      const spec = yield* Database.add(Markdown.make({ name: SPEC_NAME, content: SPEC_TEXT }));
      yield* Database.add(TaskSet.make({ name: SPEC_SET }));
      const others = yield* Effect.forEach(OTHER_TASKS, (title) => Database.add(Task.make({ title, status: 'todo' })));
      yield* Database.add(TaskSet.make({ name: 'Ops', tasks: others.map((task) => Ref.make(task)) }));
      yield* Database.flush();
      return { objects: [Ref.make(spec)] };
    }),
  instructions: trim`
    Read the "${SPEC_NAME}" document and create a task for every requirement in its Requirements
    section, titled exactly with the requirement's heading. Put them in the "${SPEC_SET}" task list.
  `,
  scorers: [
    Scorer.make({
      name: 'requirements-filed',
      description: `Share of the ${REQUIREMENTS.length} requirements filed as a task in "${SPEC_SET}", titled exactly.`,
      score: taskSetTasks(SPEC_SET).pipe(
        Effect.map(
          (filed) =>
            REQUIREMENTS.filter((title) => filed?.some((task) => task.title === title)).length / REQUIREMENTS.length,
        ),
      ),
    }),
    Scorer.make({
      name: 'nothing-extra-filed',
      description: 'The list holds only the requirements, once each: no appendix heading, no duplicate.',
      score: taskSetTasks(SPEC_SET).pipe(
        Effect.map(
          (filed) =>
            filed !== undefined &&
            filed.length === REQUIREMENTS.length &&
            new Set(filed.map((task) => task.title)).size === REQUIREMENTS.length,
        ),
      ),
    }),
    Scorer.make({
      name: 'other-tasks-untouched',
      description: 'The unrelated task list still holds just its two tasks, unchanged.',
      score: taskSetTasks('Ops').pipe(
        Effect.map(
          (ops) =>
            ops?.length === OTHER_TASKS.length &&
            OTHER_TASKS.every((title) => ops.some((task) => task.title === title && task.status === 'todo')),
        ),
      ),
    }),
    Scorer.make({
      name: 'document-unchanged',
      description: 'The spec itself was only read.',
      score: documentText(SPEC_NAME).pipe(Effect.map((text) => text === SPEC_TEXT)),
    }),
  ],
});

//
// 8. Editing a section by its heading: one section rewritten, its links kept, a decoy left alone.
//

const OVERVIEW_NAME = 'DXOS';
const DECOY_NAME = 'Composer';
const HTTPS_LINK = 'https://docs.dxos.org/guide/services';

/** A document's `## ` sections, by heading, each with its body as written. */
const sections = (text: string): Map<string, string> =>
  new Map(
    text
      .split(/^## /m)
      .slice(1)
      .map((section) => {
        const newline = section.indexOf('\n');
        return [section.slice(0, newline).trim(), section.slice(newline + 1)] as const;
      }),
  );

const UNTOUCHED_SECTIONS = ['Overview', 'Storage', 'Roadmap'];

/** The seeded texts, which need the linked documents' ids, so they are built at seed time. */
const overviewText = (edgeId: string, hubId: string) =>
  [
    `# ${OVERVIEW_NAME}`,
    '## Overview',
    'DXOS is a platform for local-first collaborative software.\n',
    '## Services',
    `Every device talks to [EDGE](echo:///${edgeId}), which relays sync traffic and runs agents, and to ` +
      `the [Hub](echo:///${hubId}), which issues accounts and invitations; both are described in the ` +
      `[services guide](${HTTPS_LINK}) along with how to run them locally.\n`,
    '## Storage',
    'Each space is stored as Automerge documents, replicated to every member.\n',
    '## Roadmap',
    'Next: faster cold start, and sharing beyond a single space.\n',
  ].join('\n\n');

const DECOY_TEXT = [
  `# ${DECOY_NAME}`,
  '## Services',
  'Composer reaches the same services through the client, with no configuration of its own.\n',
].join('\n\n');

/** The linked documents' ids in this run's space, which the seeded links name. */
const linkedIds = Effect.gen(function* () {
  const edge = yield* findObject(Markdown.Document, (candidate) => candidate.name === 'EDGE design');
  const hub = yield* findObject(Markdown.Document, (candidate) => candidate.name === 'Hub design');
  return { edgeId: edge?.id ?? '', hubId: hub?.id ?? '' };
});

/** The overview's links, as seeded. */
const overviewLinks = linkedIds.pipe(
  Effect.map(({ edgeId, hubId }) => [`echo:///${edgeId}`, `echo:///${hubId}`, HTTPS_LINK]),
);

defineTask({
  title: 'rewrites one section in place and keeps its links',
  skills: () => [...getDefaultSkills(), Ref.make(MarkdownSkill.make())],
  plugins: [MarkdownPlugin.make()],
  turns: { target: 4, budget: 15 },
  seed: () =>
    Effect.gen(function* () {
      const edge = yield* Database.add(Markdown.make({ name: 'EDGE design', content: '# EDGE\n' }));
      const hub = yield* Database.add(Markdown.make({ name: 'Hub design', content: '# Hub\n' }));
      const overview = yield* Database.add(
        Markdown.make({ name: OVERVIEW_NAME, content: overviewText(edge.id, hub.id) }),
      );
      yield* Database.add(Markdown.make({ name: DECOY_NAME, content: DECOY_TEXT }));
      yield* Database.flush();
      return { objects: [Ref.make(overview)] };
    }),
  instructions: trim`
    In the "${OVERVIEW_NAME}" document, rewrite the "Services" section as a bulleted list. Keep every
    link, and don't touch the other sections.
  `,
  scorers: [
    Scorer.make({
      name: 'section-bulleted',
      description:
        'The Services section is now a bulleted list (two bullets or more; a lead-in or closing line around them is fine).',
      score: documentText(OVERVIEW_NAME).pipe(
        Effect.map((text) => {
          const services = text === undefined ? undefined : sections(text).get('Services');
          return (services?.split('\n').filter((line) => /^\s*[-*] /.test(line)).length ?? 0) >= 2;
        }),
      ),
    }),
    Scorer.make({
      name: 'links-kept',
      description: 'Every link the section held is still in it.',
      score: Effect.gen(function* () {
        const text = yield* documentText(OVERVIEW_NAME);
        const links = yield* overviewLinks;
        const services = text === undefined ? '' : (sections(text).get('Services') ?? '');
        return links.filter((link) => services.includes(link)).length / links.length;
      }),
    }),
    Scorer.make({
      name: 'other-sections-untouched',
      description: 'Every other section reads exactly as it did.',
      score: Effect.gen(function* () {
        const text = yield* documentText(OVERVIEW_NAME);
        if (text === undefined) {
          return false;
        }
        const { edgeId, hubId } = yield* linkedIds;
        const before = sections(overviewText(edgeId, hubId));
        const after = sections(text);
        return UNTOUCHED_SECTIONS.every((heading) => after.get(heading) === before.get(heading));
      }),
    }),
    Scorer.make({
      name: 'decoy-untouched',
      description: 'The other document with a Services section was left alone.',
      score: documentText(DECOY_NAME).pipe(Effect.map((text) => text === DECOY_TEXT)),
    }),
    Scorer.database({
      name: 'no-new-document',
      description: 'The section was rewritten in place, not into a new document.',
      query: documents,
      score: (results) => results.length === 4,
    }),
  ],
});

//
// 9. Repairing structure: a deck whose slide list holds a reference to nothing.
//

const DECK_NAME = 'Roadmap';
const DECK_SLIDES = ['# Intro', '# Q1', '# Q3', '# Q4'];
/** Where the broken slide sits in the deck, between Q1 and Q3. */
const BROKEN_AT = 2;

/** The deck's slides as the run left them: each one's markdown, or `undefined` for a slide that does not load. */
const deckSlides = Scorer.shared(
  Effect.gen(function* () {
    const deck = yield* findObject(Presentation.Presentation, (candidate) => candidate.name === DECK_NAME);
    if (!deck) {
      return undefined;
    }
    return yield* Effect.forEach(deck.slides, (ref) =>
      Effect.gen(function* () {
        const slide = yield* Database.load(ref);
        const content = yield* Database.load(slide.content);
        return 'content' in content && typeof content.content === 'string' ? content.content : '';
      }).pipe(Effect.orElseSucceed(() => undefined)),
    );
  }),
);

defineTask({
  title: 'repairs a deck with a slide that does not load',
  plugins: [PresenterPlugin.make()],
  types: [Presentation.Presentation, Presentation.Slide],
  turns: { target: 4, budget: 15 },
  seed: () =>
    Effect.gen(function* () {
      const deck = yield* Database.add(Presentation.make({ name: DECK_NAME, slides: DECK_SLIDES }));
      // A reference to an object that was never stored, as a slide deleted before its deck dropped it leaves behind.
      const dangling = Ref.fromURI(URI.make(`echo:///${EntityId.random()}`));
      Obj.update(deck, (deck) => {
        deck.slides.splice(BROKEN_AT, 0, dangling);
      });
      yield* Database.flush();
      return { objects: [Ref.make(deck)] };
    }),
  instructions: trim`
    The "${DECK_NAME}" deck looks broken: one of its slides won't open. Find the broken slide and fix the
    deck so every slide works. Don't change the other slides.
  `,
  scorers: [
    Scorer.make({
      name: 'every-slide-loads',
      description: 'Every slide the deck lists loads, with its content.',
      score: deckSlides.pipe(
        Effect.map(
          (slides) => slides !== undefined && slides.length > 0 && slides.every((slide) => slide !== undefined),
        ),
      ),
    }),
    Scorer.make({
      name: 'other-slides-kept',
      description: 'The working slides are all still there, unchanged and in their order.',
      score: deckSlides.pipe(
        Effect.map((slides) => {
          const kept = (slides ?? []).filter((slide) => slide !== undefined && DECK_SLIDES.includes(slide));
          return kept.length === DECK_SLIDES.length && kept.every((slide, index) => slide === DECK_SLIDES[index]);
        }),
      ),
    }),
    Scorer.database({
      name: 'one-deck',
      description: 'The deck was repaired, not rebuilt as a second one.',
      query: Query.select(Filter.type(Presentation.Presentation)),
      score: (decks) => decks.length === 1,
    }),
  ],
});

//
// 10. Aggregating many objects into a new artifact: counts in a sheet, and a chart of them.
//

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const SHEET_NAME = 'Tasks by priority';

/** Sixty tasks: every priority, some of them closed, which an aggregate of open tasks has to leave out. */
const PRIORITY_TASKS = Array.from({ length: 60 }, (_, index) => ({
  title: `Task ${index + 1}`,
  priority: PRIORITIES[(index * 7) % 4],
  status: index % 5 === 0 ? ('done' as const) : index % 11 === 0 ? ('cancelled' as const) : ('todo' as const),
}));
const OPEN_COUNTS: Record<string, number> = Object.fromEntries(
  PRIORITIES.map((priority) => [
    priority,
    PRIORITY_TASKS.filter((task) => task.priority === priority && task.status === 'todo').length,
  ]),
);

/** A sheet's cells by `row:column` position. */
const sheetGrid = (sheet: Sheet.Sheet): Map<string, unknown> =>
  new Map(
    Object.entries(sheet.cells).map(([index, cell]) => {
      const { row, col } = SheetUtil.addressFromIndex(sheet, index);
      return [`${row}:${col}`, cell.value];
    }),
  );

const prioritySheet = Scorer.shared(findObject(Sheet.Sheet, (candidate) => candidate.name === SHEET_NAME));

defineTask({
  title: 'counts open tasks into a sheet with a chart',
  skills: () => [...getDefaultSkills(), Ref.make(SheetSkill.make())],
  plugins: [SheetPlugin.make(), TasksPlugin.make()],
  types: [Task.Task, Sheet.Sheet, Sheet.Chart],
  turns: { target: 4, budget: 15 },
  seed: () =>
    Effect.gen(function* () {
      yield* Effect.forEach(PRIORITY_TASKS, (task) => Database.add(Task.make(task)));
      yield* Database.add(Sheet.make({ name: 'Old report', cells: { A1: { value: 'stale' } } }));
      yield* Database.flush();
      return {};
    }),
  instructions: trim`
    Make a sheet called "${SHEET_NAME}" with one row per priority (low, medium, high, urgent) and the number
    of open tasks of that priority beside it, then add a bar chart of it.
  `,
  scorers: [
    Scorer.make({
      name: 'counts-correct',
      description: 'Share of the priorities whose row holds the exact count of open tasks beside the name.',
      score: prioritySheet.pipe(
        Effect.map((sheet) => {
          if (!sheet) {
            return 0;
          }
          const grid = sheetGrid(sheet);
          const correct = PRIORITIES.filter((priority) =>
            [...grid].some(([position, value]) => {
              if (String(value).toLowerCase() !== priority) {
                return false;
              }
              const [row, col] = position.split(':').map(Number);
              return Number(grid.get(`${row}:${col + 1}`)) === OPEN_COUNTS[priority];
            }),
          );
          return correct.length / PRIORITIES.length;
        }),
      ),
    }),
    Scorer.make({
      name: 'chart-added',
      description: 'A chart of the new sheet exists.',
      score: Effect.gen(function* () {
        const sheet = yield* prioritySheet;
        const charts = yield* Database.query(Filter.type(Sheet.Chart)).run;
        return sheet !== undefined && charts.some((chart) => refTarget(chart.sheet) === sheet.id);
      }),
    }),
    Scorer.database({
      name: 'one-new-sheet',
      description: 'Exactly one sheet was added beside the old report, which is unchanged.',
      query: Query.select(Filter.type(Sheet.Sheet)),
      score: (sheets) =>
        sheets.length === 2 &&
        sheets.some((sheet) => sheet.name === 'Old report' && [...sheetGrid(sheet).values()].join() === 'stale'),
    }),
    Scorer.database({
      name: 'tasks-untouched',
      description: 'An aggregate only reads: every task keeps its status.',
      query: tasks,
      score: (results) =>
        results.length === PRIORITY_TASKS.length &&
        PRIORITY_TASKS.every(({ title, status }) =>
          results.some((task) => task.title === title && task.status === status),
        ),
    }),
  ],
});

//
// 11. Finding context by structure: the project this chat belongs to, through the chat's parent.
//

const OWNER = 'Atlas';
const ATLAS_TASKS = [
  { title: 'Migrate the billing tables', status: 'todo' as const },
  { title: 'Write the rollout plan', status: 'started' as const },
  { title: 'Pick a vendor', status: 'done' as const },
  { title: 'Draft the budget', status: 'done' as const },
  { title: 'Hire a contractor', status: 'cancelled' as const },
];
const OPEN_TITLES = ['Migrate the billing tables', 'Write the rollout plan'];
/** Another project with open tasks of its own, which an answer about "this chat" must not list. */
const DECOY_PROJECT = { name: 'Beacon', tasks: ['Renew the domain', 'Fix the login page'] };

/** A project with its own task set of `entries`. */
const makeProject = (name: string, entries: readonly { title: string; status: Task.Task['status'] }[]) =>
  Effect.gen(function* () {
    const added = yield* Effect.forEach(entries, (entry) => Database.add(Task.make(entry)));
    const taskSet = yield* Database.add(
      TaskSet.make({ name: `${name} tasks`, tasks: added.map((task) => Ref.make(task)) }),
    );
    return yield* Database.add(Project.make({ name, taskSet: Ref.make(taskSet) }));
  });

defineTask({
  title: 'answers from the project that owns the chat',
  skills: projectSkills,
  plugins: projectPlugins(),
  types: PROJECT_TYPES,
  turns: { target: 3, budget: 12 },
  seed: () =>
    Effect.gen(function* () {
      const owner = yield* makeProject(OWNER, ATLAS_TASKS);
      yield* makeProject(
        DECOY_PROJECT.name,
        DECOY_PROJECT.tasks.map((title) => ({ title, status: 'todo' as const })),
      );
      // The chat belongs to its project by the ECHO parent edge, as a chat opened in a project does.
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Agent.makeSession({ feed: Ref.make(feed), name: 'Planning chat' }));
      Obj.setParent(chat, owner);
      yield* Database.flush();
      return { chat: Ref.make(chat) };
    }),
  instructions: trim`
    What project is this chat in, and which of its tasks are still open? Don't change anything.
  `,
  scorers: [
    Scorer.make({
      name: 'project-named',
      description: `The reply names the chat's project, ${OWNER}.`,
      score: assistantText.pipe(Effect.map((text) => text.includes(OWNER))),
    }),
    Scorer.make({
      name: 'open-tasks-listed',
      description: "Share of the project's open tasks the reply lists.",
      score: assistantText.pipe(
        Effect.map((text) => OPEN_TITLES.filter((title) => text.includes(title)).length / OPEN_TITLES.length),
      ),
    }),
    Scorer.make({
      name: 'other-project-left-out',
      description: "The reply lists none of the other project's tasks: it answered about this chat's project only.",
      score: assistantText.pipe(Effect.map((text) => !DECOY_PROJECT.tasks.some((title) => text.includes(title)))),
    }),
    Scorer.database({
      name: 'nothing-changed',
      description: 'A question changes nothing: every task keeps its status, and none is added.',
      query: tasks,
      score: (results) =>
        results.length === ATLAS_TASKS.length + DECOY_PROJECT.tasks.length &&
        ATLAS_TASKS.every(({ title, status }) =>
          results.some((task) => task.title === title && task.status === status),
        ),
    }),
  ],
});
