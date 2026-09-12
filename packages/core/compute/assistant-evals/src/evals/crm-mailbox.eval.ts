//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Obj, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as CrmPlugin from '@dxos/plugin-crm/CrmPlugin';
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { judge } from '../judge.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

// Ported from the gated `CRM Mailbox` scenario (../testing/crm-mailbox.test.ts).
// Grades the DB effect directly instead of the agent's self-reported `completedCriteria`. Existence
// (dimension G) and accuracy (dimensions A/B/H, via an LLM judge) are graded separately: a record
// can exist yet still misrepresent the source email, which no deterministic check alone can catch.

const ACCURACY_JUDGE_RUBRIC = trim`
  You are checking whether CRM records created from a source email are ACCURATE — not just
  present, but correct — compared against that email.

  Pass only if all of the following hold:
  - The Person's name matches the sender's name in the email signature.
  - The Organization's name matches the sender's company in the email signature/domain.
  - The Employer relation's role reflects what the email signature states for that person (an
    elaboration or more complete title is fine; a wrong, contradictory, or fabricated role is not).

  Fail if any of the CRM records is missing, or if any field is incorrect, invented, or contradicts
  the source email.
`;

const SEED_EMAIL_INPUT = {
  sender: { name: 'Vishal @ SigNoz', email: 'vishal@mail.signoz.io' },
  blocks: [
    {
      _tag: 'text',
      text: trim`
        Hi there,

        Your AI Assistant access is live — meet Noz, SigNoz's AI observability assistant.

        Let us know if you have any questions getting started.

        Best,
        Vishal Sharma
        Founding Engineer @ SigNoz

        SigNoz Inc
        2261 Market Street #4010
        San Francisco, CA 94114
      `,
    },
  ],
  properties: {
    subject: 'Your AI Assistant access is live. Meet Noz.',
  },
  created: '2026-06-26T12:00:00.000Z',
};

const PERSON_NAME = 'Vishal Sharma';
const ORGANIZATION_NAME = 'SigNoz';

const person = Scorer.shared(findObject(Person.Person, (candidate) => candidate.fullName === PERSON_NAME));
const organization = Scorer.shared(
  findObject(Organization.Organization, (candidate) => candidate.name === ORGANIZATION_NAME),
);
const employerRelation = Scorer.shared(
  findObject(Employer.Employer, (relation) => {
    const source = Relation.getSource(relation);
    const target = Relation.getTarget(relation);
    return source?.fullName === PERSON_NAME && target?.name === ORGANIZATION_NAME;
  }),
);
const summaryProfile = Scorer.shared(
  findObject(ProfileOf.ProfileOf, (relation) => {
    const target = Relation.getTarget(relation);
    return Obj.instanceOf(Organization.Organization, target) && target.name === ORGANIZATION_NAME;
  }),
);

/** The judge's verdict on whether the records the run created match the email it worked from. */
const accuracyVerdict = Scorer.shared(
  Effect.gen(function* () {
    const foundPerson = yield* person;
    const foundOrganization = yield* organization;
    const foundRelation = yield* employerRelation;
    const createdRecords = {
      person: foundPerson ? { fullName: foundPerson.fullName } : null,
      organization: foundOrganization ? { name: foundOrganization.name } : null,
      employerRole: foundRelation?.role ?? null,
    };
    return yield* judge(ACCURACY_JUDGE_RUBRIC, JSON.stringify({ sourceEmail: SEED_EMAIL_INPUT, createdRecords }));
  }),
);

const SCORERS = [
  Scorer.make({
    name: 'person-created',
    description: `A Person object for ${PERSON_NAME} exists in the database.`,
    score: person.pipe(Effect.map((person) => !!person)),
  }),
  Scorer.make({
    name: 'organization-created',
    description: `An Organization object named ${ORGANIZATION_NAME} exists in the database.`,
    score: organization.pipe(Effect.map((organization) => !!organization)),
  }),
  Scorer.make({
    name: 'employer-relation-created',
    description: `An Employer relation between ${PERSON_NAME} and ${ORGANIZATION_NAME} exists.`,
    score: employerRelation.pipe(Effect.map((relation) => !!relation)),
  }),
  Scorer.make({
    name: 'employer-role-correct',
    description: 'The Employer relation\'s role is "Founding Engineer", stored as a proper schema field.',
    score: employerRelation.pipe(Effect.map((relation) => relation?.role === 'Founding Engineer')),
  }),
  Scorer.make({
    name: 'summary-document-linked',
    description: `A Profile Document is linked to the ${ORGANIZATION_NAME} Organization via a ProfileOf relation.`,
    score: summaryProfile.pipe(Effect.map((profile) => !!profile)),
  }),
  Scorer.make({
    name: 'crm-data-accurate',
    description: 'An LLM judge confirms the CRM records accurately reflect the source email (not just present).',
    score: accuracyVerdict.pipe(Effect.map((verdict) => verdict.pass)),
  }),
];

const task = createEvalRunner({
  instructions: trim`
    The database starts empty.

    Enable these skills using the skill manager:
    - org.dxos.skill.crm
    - org.dxos.skill.webSearch
    - org.dxos.skill.database
    - org.dxos.skill.markdown

    A new email message is provided in the <input> block below.
    - Research the sender and any contacts mentioned in the message.
    - Create and link a summary document for the sender's Organization if one does not already exist.
    - Create or update CRM Profiles (Person and/or Organization objects) for those contacts using the CRM tools.

    <input>${JSON.stringify(SEED_EMAIL_INPUT)}</input>
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  plugins: [CrmPlugin.make(), MarkdownPlugin.make()],
  // Research (web search) + CRM + markdown tool calls chain across several turns; ~95s alone, and
  // the nightly runs it beside the hour-long scenarios.
  timeout: 300_000,
  scored: true,
});

evalite('CRM Mailbox — processes a mailbox email into CRM profiles and employer relation', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});

// A judge that only ever passes would be worthless as a scorer — this demonstrates it correctly
// fails records that exist but misrepresent the source email, on a hand-crafted mismatch rather
// than a live agent run.
const INACCURATE_RECORDS = JSON.stringify({
  sourceEmail: SEED_EMAIL_INPUT,
  createdRecords: {
    person: { fullName: 'Victor Sharma' },
    organization: { name: 'SigNoz' },
    employerRole: 'Chief Executive Officer',
  },
});

evalite('CRM Mailbox — accuracy judge correctly fails misrepresented records', {
  data: [{ input: { content: INACCURATE_RECORDS } }],
  task: (input: { content: string }) => EffectEx.runPromise(judge(ACCURACY_JUDGE_RUBRIC, input.content)),
  scorers: [
    {
      name: 'judge-correctly-fails',
      description: 'The judge fails records with a misspelled name and a fabricated role.',
      scorer: ({ output }) => (output.pass === false ? 1 : 0),
    },
  ],
});
