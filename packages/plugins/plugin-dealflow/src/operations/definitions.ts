//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { meta } from '#meta';
import { Deal } from '#types';

const DEALFLOW_OPERATION = `${meta.id}.operation`;

/**
 * Enrich a Deal's Organization with data from Harmonic AI.
 * Calls the Harmonic API to fetch company details, funding history,
 * and team information, then updates the Organization and creates
 * Person objects for key team members.
 */
export const EnrichDeal = Operation.make({
  meta: {
    key: `${DEALFLOW_OPERATION}.enrich-deal`,
    name: 'Enrich deal',
    description:
      'Enriches a deal with company data from Harmonic AI. Updates the organization with funding history, team info, and company details. Creates Person objects for founders and key team members.',
  },
  input: Schema.Struct({
    deal: Ref.Ref(Deal.Deal).annotations({
      description: 'Reference to the deal to enrich.',
    }),
    companyDomain: Schema.optional(Schema.String).annotations({
      description: 'Company domain to look up (e.g., "acme.com"). If not provided, uses the organization website.',
    }),
  }),
  output: Schema.Struct({
    enriched: Schema.Boolean.annotations({
      description: 'Whether the enrichment was successful.',
    }),
    companyName: Schema.optional(Schema.String),
    fundingTotal: Schema.optional(Schema.String),
    teamSize: Schema.optional(Schema.Number),
    signalsCreated: Schema.Number.annotations({
      description: 'Number of signals created from enrichment data.',
    }),
  }),
  services: [Database.Service],
});

/**
 * Scan for signals related to a deal from all connected data sources.
 */
export const ScanSignals = Operation.make({
  meta: {
    key: `${DEALFLOW_OPERATION}.scan-signals`,
    name: 'Scan signals',
    description:
      'Scans for recent signals related to a deal. Checks all connected data sources (Trello, Granola, Slack, Gmail) for activity related to the deal organization.',
  },
  input: Schema.Struct({
    deal: Ref.Ref(Deal.Deal).annotations({
      description: 'Reference to the deal to scan signals for.',
    }),
    lookbackDays: Schema.optional(Schema.Number).annotations({
      description: 'Number of days to look back for signals. Defaults to 30.',
    }),
  }),
  output: Schema.Struct({
    signals: Schema.Array(
      Schema.Struct({
        title: Schema.String,
        kind: Schema.String,
        source: Schema.String,
        detectedAt: Schema.String,
      }),
    ).annotations({
      description: 'List of signals found for this deal.',
    }),
  }),
  services: [Database.Service],
});

/**
 * Generate an assessment document for a deal.
 */
export const GenerateAssessment = Operation.make({
  meta: {
    key: `${DEALFLOW_OPERATION}.generate-assessment`,
    name: 'Generate assessment',
    description:
      'Generates an initial assessment document for a deal based on available data: company info, team, signals, meeting notes. The assessment is saved as a Document linked to the deal.',
  },
  input: Schema.Struct({
    deal: Ref.Ref(Deal.Deal).annotations({
      description: 'Reference to the deal to assess.',
    }),
  }),
  output: Schema.Struct({
    documentName: Schema.String.annotations({
      description: 'Name of the generated assessment document.',
    }),
  }),
  services: [Database.Service],
});

/**
 * Query deals with optional filters.
 */
export const QueryDeals = Operation.make({
  meta: {
    key: `${DEALFLOW_OPERATION}.query-deals`,
    name: 'Query deals',
    description:
      'Queries deals with optional filters by stage, sector, or date range. Returns a summary of matching deals.',
  },
  input: Schema.Struct({
    stage: Schema.optional(Schema.String).annotations({
      description: 'Filter by deal stage (sourcing, screening, diligence, termsheet, closed, passed).',
    }),
    sector: Schema.optional(Schema.String).annotations({
      description: 'Filter by sector/vertical tag.',
    }),
    limit: Schema.optional(Schema.Number).annotations({
      description: 'Maximum number of deals to return. Defaults to 20.',
    }),
  }),
  output: Schema.Struct({
    deals: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        stage: Schema.String,
        organization: Schema.optional(Schema.String),
        round: Schema.optional(Schema.String),
        sectors: Schema.optional(Schema.Array(Schema.String)),
        lastActivity: Schema.optional(Schema.String),
      }),
    ).annotations({
      description: 'List of deals matching the filters.',
    }),
    total: Schema.Number,
  }),
  services: [Database.Service],
});
