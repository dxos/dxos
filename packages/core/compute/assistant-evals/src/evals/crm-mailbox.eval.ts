//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Relation } from '@dxos/echo';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject } from '../assertions';
import { createEvalRunner } from '../runner';

// Ported from the gated `CRM Mailbox` scenario (../testing/crm-mailbox.test.ts).
// Grades the DB effect directly instead of the agent's self-reported `completedCriteria`.

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
  plugins: [CrmPlugin(), MarkdownPlugin()],
  dbQuery: () =>
    Effect.gen(function* () {
      const person = yield* findObject(Person.Person, (p) => p.fullName === 'Vishal Sharma');
      const organization = yield* findObject(Organization.Organization, (o) => o.name === 'SigNoz');
      const employerRelation = yield* findObject(Employer.Employer, (rel) => {
        const source = Relation.getSource(rel);
        const target = Relation.getTarget(rel);
        return source?.fullName === 'Vishal Sharma' && target?.name === 'SigNoz';
      });

      return {
        personExists: !!person,
        organizationExists: !!organization,
        employerRelationExists: !!employerRelation,
        employerRoleCorrect: employerRelation?.role === 'Founding Engineer',
      };
    }),
});

evalite('CRM Mailbox — processes a mailbox email into CRM profiles and employer relation', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'person-created',
      description: 'A Person object for Vishal Sharma exists in the database.',
      scorer: ({ output }) => (output.dbQuery.personExists ? 1 : 0),
    },
    {
      name: 'organization-created',
      description: 'An Organization object named SigNoz exists in the database.',
      scorer: ({ output }) => (output.dbQuery.organizationExists ? 1 : 0),
    },
    {
      name: 'employer-relation-created',
      description: 'An Employer relation between Vishal Sharma and SigNoz exists.',
      scorer: ({ output }) => (output.dbQuery.employerRelationExists ? 1 : 0),
    },
    {
      name: 'employer-role-correct',
      description: 'The Employer relation\'s role is "Founding Engineer", stored as a proper schema field.',
      scorer: ({ output }) => (output.dbQuery.employerRoleCorrect ? 1 : 0),
    },
  ],
});
