//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { objectExists } from '../assertions';
import { createEvalRunner } from '../runner';

// Ported from the gated `Database > create and query` scenario (../testing/database.test.ts).
// Grades the DB effect directly instead of the agent's own self-reported `completedCriteria`.
const task = createEvalRunner({
  instructions: trim`
    Create a new organization called "{{name}}".
    Query the database to confirm that the organization is created and the query tool is working.
  `,
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Unknown,
  dbQuery: ({ name }: { name: string }) => objectExists(Organization.Organization, (org) => org.name === name),
});

evalite('Database — create and query', {
  data: [{ input: { name: 'Cyberdyne Systems' } }],
  task,
  scorers: [
    {
      name: 'organization-created',
      description: 'The named Organization object exists in the DB after the run.',
      scorer: ({ output }) => (output.dbQuery ? 1 : 0),
    },
  ],
});
