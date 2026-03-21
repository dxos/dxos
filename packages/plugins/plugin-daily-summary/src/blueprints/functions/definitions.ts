//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

/**
 * Generates a daily summary of recently modified objects.
 * Queries the database for objects updated within a time window,
 * creates a Markdown document with the summary, and adds it to a "Summaries" collection.
 */
export const GenerateSummary = Operation.make({
  meta: {
    key: 'org.dxos.function.daily-summary.generate',
    name: 'Generate Daily Summary',
    description: 'Queries objects modified in the last day and generates a markdown document summarizing activity.',
  },
  input: Schema.Struct({
    previousSummary: Schema.optional(Schema.String).annotations({
      description: 'The previous day summary text for context continuity.',
    }),
    lookbackHours: Schema.optional(Schema.Number).annotations({
      description: 'Number of hours to look back for modified objects. Defaults to 24.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotations({
      description: 'DXN of the created markdown document.',
    }),
    objectCount: Schema.Number.annotations({
      description: 'Number of objects included in the summary.',
    }),
    date: Schema.String.annotations({
      description: 'ISO date string for the summary.',
    }),
  }),
  services: [Database.Service],
});
