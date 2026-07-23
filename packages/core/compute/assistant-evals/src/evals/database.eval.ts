//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { objectExists, toolInvocations } from '../assertions';
import { createEvalRunner } from '../runner';

const QUERY_OPERATION_KEY = 'dxn:org.dxos.function.database.query';

// Ported from the gated `Database > create and query` scenario (../testing/database.test.ts).
// Grades the DB effect directly instead of the agent's own self-reported `completedCriteria`.
const task = createEvalRunner({
  instructions: trim`
    Create a new organization called "{{name}}".
    Query the database to confirm that the organization is created and the query tool is working.
  `,
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Unknown,
  dbQuery: ({ name }: { name: string }) =>
    Effect.gen(function* () {
      const organizationExists = yield* objectExists(Organization.Organization, (org) => org.name === name);
      const invocations = yield* toolInvocations();
      return {
        organizationExists,
        queried: invocations.some((invocation) => invocation.operationKey === QUERY_OPERATION_KEY),
      };
    }),
});

evalite('Database — create and query', {
  data: [{ input: { name: 'Cyberdyne Systems' } }],
  task,
  scorers: [
    {
      name: 'organization-created',
      description: 'The named Organization object exists in the DB after the run.',
      scorer: ({ output }) => (output.dbQuery.organizationExists ? 1 : 0),
    },
    {
      name: 'database-queried',
      description: 'The database query operation was actually invoked, not just claimed.',
      scorer: ({ output }) => (output.dbQuery.queried ? 1 : 0),
    },
  ],
});
