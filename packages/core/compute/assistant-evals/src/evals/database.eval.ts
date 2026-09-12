//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Filter, Query } from '@dxos/echo';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

const QUERY_OPERATION_KEY = 'dxn:org.dxos.operation.space.queryObjects';

/** The organization the run is asked to create; the scorer reads it back by the same name. */
const ORGANIZATION_NAME = 'Cyberdyne Systems';

// Ported from the gated `Database > create and query` scenario (../testing/database.test.ts).
// Grades the DB effect directly instead of the agent's own self-reported `completedCriteria`.

const SCORERS = [
  Scorer.database({
    name: 'organization-created',
    description: 'The named Organization object exists in the DB after the run.',
    query: Query.select(Filter.type(Organization.Organization)),
    score: (organizations) => organizations.some((organization) => organization.name === ORGANIZATION_NAME),
  }),
  Scorer.toolCalls({
    name: 'database-queried',
    description: 'The database query operation was actually invoked, not just claimed.',
    score: (invocations) => invocations.some((invocation) => invocation.operationKey === QUERY_OPERATION_KEY),
  }),
];

const task = createEvalRunner({
  instructions: trim`
    Create a new organization called "{{name}}".
    Query the database to confirm that the organization is created and the space-query-objects tool is working.
  `,
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Unknown,
  scorers: SCORERS,
});

evalite('Database — create and query', {
  data: [{ input: { name: ORGANIZATION_NAME } }],
  trialCount: 3,
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
