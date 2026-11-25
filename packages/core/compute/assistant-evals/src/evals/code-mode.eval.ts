//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { PlainDialect, makeCodeModeTurnProducer } from '@dxos/agent-code-mode';
import { type MakeTurnProducer } from '@dxos/agent-runtime';
import { Model } from '@dxos/ai';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { getTextInAnchorRange, toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { type DXN } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { Organization, Person } from '@dxos/types';
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
  turns = { target: 3, budget: 15 },
}: {
  title: string;
  instructions: string;
  scorers: Scorer.Any[];
  seed?: RunnerOptions['seed'];
  skills?: RunnerOptions['skills'];
  plugins?: RunnerOptions['plugins'];
  /** Model round trips the task should take, and the count at which it scores nothing. */
  turns?: { target: number; budget: number };
}) => {
  const task = createEvalRunner({
    name: `Code mode — ${title}`,
    instructions,
    input: Schema.Null,
    output: Schema.Unknown,
    types: [Organization.Organization, Person.Person],
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
      // Matched on the ref URI's last path segment, because the URI's shape is not ours to
      // predict: an agent writes whichever form it writes (`echo:<id>` here), `Database.load`
      // rejects that one as an unsupported URI kind, `Ref.hasEntityId` accepts only the local
      // `echo:///<id>` form, and `EID.tryParse` returns nothing for it. Comparing the segment
      // rather than searching the whole string keeps a space id from standing in for an object's.
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
        const target = String(ada.organization.uri).split(/[:/]/).filter(Boolean).at(-1);
        return target === initech.id;
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
      const anchor = toCursorRange(accessor, PREFIX.length, PREFIX.length + PASSAGE.length);
      const selected = getTextInAnchorRange(accessor, anchor);
      if (selected !== PASSAGE) {
        return yield* Effect.die(new Error(`The selection resolved to the wrong text: ${selected}`));
      }
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
