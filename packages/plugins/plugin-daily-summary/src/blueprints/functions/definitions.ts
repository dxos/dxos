//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

/**
 * Generates a daily summary of recently modified objects using AI.
 * Queries the database for objects updated within a time window,
 * sends them to an LLM for summarization, and creates/updates
 * a Markdown document in a "Summaries" collection.
 */
export const GenerateSummary = Operation.make({
  meta: {
    key: 'org.dxos.function.daily-summary.generate',
    name: 'Generate Daily Summary',
    description: 'Queries objects modified in the last day and generates an AI-summarized markdown document.',
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
      description: 'DXN of the created or updated markdown document.',
    }),
    objectCount: Schema.Number.annotations({
      description: 'Number of objects included in the summary.',
    }),
    date: Schema.String.annotations({
      description: 'Date label for the summary (e.g., "March 20").',
    }),
  }),
  services: [Database.Service, AiService.AiService],
});
