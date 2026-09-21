//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { EffectDialect, makeCodeModeTurnProducer } from '@dxos/agent-code-mode';
import { type MakeTurnProducer } from '@dxos/agent-runtime';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { completedBlocks } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

/**
 * Code mode across a spread of database work, one engine per variant.
 *
 * The point is the comparison, not any single score: every task runs on DXOS's own tool-calling
 * `AiSession` and on both code-mode dialects, with the same skills, prompt and scorers, so a column
 * that only fails on one engine is evidence about that engine rather than about the task.
 */
const ENGINES: { name: string; input: { makeTurnProducer?: MakeTurnProducer } }[] = [
  // No producer: the default `AiSession`, where every action is its own tool call.
  { name: 'tools', input: {} },
  { name: 'code-mode-plain', input: { makeTurnProducer: makeCodeModeTurnProducer() } },
  {
    name: 'code-mode-effect',
    input: { makeTurnProducer: makeCodeModeTurnProducer({ dialect: EffectDialect }) },
  },
];

/** `DX_EVAL_ENGINES` narrows the matrix, comma-separated; unset or empty runs every engine. */
const selected = process.env.DX_EVAL_ENGINES?.trim()
  ? process.env.DX_EVAL_ENGINES.split(',').map((name) => name.trim())
  : undefined;
const VARIANTS = selected ? ENGINES.filter(({ name }) => selected.includes(name)) : ENGINES;

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

/**
 * One task, run on every engine in the matrix. Declared as a function so each task's scorers are
 * written against its own outcome rather than switched on at grading time.
 */
const defineTask = ({
  title,
  instructions,
  scorers,
  seed,
}: {
  title: string;
  instructions: string;
  scorers: Scorer.Any[];
  seed?: Parameters<typeof createEvalRunner>[0]['seed'];
}) => {
  const task = createEvalRunner({
    instructions,
    input: Schema.Null,
    output: Schema.Unknown,
    types: [Organization.Organization, Person.Person],
    timeout: TIMEOUT,
    gradeIncomplete: true,
    scored: true,
    ...(seed ? { seed } : {}),
  });

  evalite.each(VARIANTS)(`Code mode — ${title}`, {
    data: [{ input: null }],
    task,
    scorers: Scorer.toEvalite(scorers),
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
