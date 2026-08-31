//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, DXN, Ref } from '@dxos/echo';
import { FactStore } from '@dxos/pipeline-rdf/fact-store';
import * as RDF from '@dxos/pipeline-rdf/types';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as ReplyGeneration from '@dxos/plugin-inbox/ReplyGeneration';

/** Default page size for {@link AnalyzeMailbox} fact-store commits. */
export const DEFAULT_ANALYZE_MAILBOX_PAGE_SIZE = 10;

/**
 * Cursored fact extraction over a mailbox feed.
 *
 * Lives in plugin-brain rather than plugin-inbox because brain owns everything it needs — the
 * `FactStore` it writes to, the settings that parameterize it, and the surfaces that read the result.
 * inbox owns the Mailbox and the feed cursor helpers, which this reaches through the plugin's public
 * API; nothing here inverts that.
 */
export const AnalyzeMailbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.brain.analyzeMailbox'),
    name: 'Analyze Mailbox',
    description: 'Extracts RDF facts from every message in a mailbox feed into the shared space fact store.',
    icon: 'ph--brain--regular',
  },
  services: [AiService.AiService, Database.Service, FactStore, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed messages are analyzed.',
    }),
    pageSize: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Number of messages processed per fact-store commit.',
      }),
    ),
    model: Schema.optional(
      Schema.String.annotate({ description: 'Extraction model DXN; defaults to the edge Claude model.' }),
    ),
    provider: Schema.optional(
      Schema.String.annotate({ description: 'AI provider id (e.g. ollama) for local extraction.' }),
    ),
    strict: Schema.optional(
      Schema.Boolean.annotate({ description: 'Strict structured output; set false for weak local models.' }),
    ),
  }),
  output: Schema.Struct({
    processed: Schema.Number,
    facts: Schema.Number,
  }),
});

/**
 * LLM-facing rendering of a fact: subject/predicate/object display strings plus the FactBank
 * factuality code, confidence, recording date, and source DXN.
 */
export const CompactFact = Schema.Struct({
  id: Schema.String,
  subject: Schema.String,
  predicate: Schema.String,
  object: Schema.String,
  factuality: RDF.FactualityValue,
  confidence: Schema.optional(Schema.Number),
  date: Schema.String,
  source: Schema.String,
});
export type CompactFact = Schema.Schema.Type<typeof CompactFact>;

/** Default maximum number of facts returned by {@link QueryFacts}. */
export const DEFAULT_QUERY_FACTS_LIMIT = 50;

export const QueryFacts = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.brain.queryFacts'),
    name: 'Query Facts',
    description:
      'Queries the space fact store (a semantic index of subject-predicate-object facts extracted from user content) with structured filters.',
    icon: 'ph--brain--regular',
  },
  services: [FactStore],
  input: Schema.Struct({
    subjectEntity: Schema.optional(
      Schema.String.annotate({ description: 'Entity slug the fact subject must match, e.g. "alice-smith".' }),
    ),
    predicate: Schema.optional(Schema.String.annotate({ description: 'Exact predicate string, e.g. "works-at".' })),
    entity: Schema.optional(
      Schema.String.annotate({ description: 'Entity slug appearing as either subject or object.' }),
    ),
    source: Schema.optional(Schema.String.annotate({ description: 'Source DXN the facts were extracted from.' })),
    minConfidence: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 }))).annotate({
        description: 'Lower bound (0..1) on factuality confidence.',
      }),
    ),
    limit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Maximum facts returned (default 50).',
      }),
    ),
  }),
  output: Schema.Struct({
    facts: Schema.Array(CompactFact),
  }),
}).pipe(Operation.visible);

export const SummarizeSubject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.brain.summarizeSubject'),
    name: 'Summarize Subject',
    description:
      'Composes a grounded summary of everything the space fact store knows about a subject (person, organization, topic), citing fact ids.',
    icon: 'ph--brain--regular',
  },
  services: [FactStore, AiService.AiService],
  input: Schema.Struct({
    subject: Schema.String.annotate({
      description: 'Entity slug or label to summarize, e.g. "Alice Smith" or "acme-corp".',
    }),
    focus: Schema.optional(
      Schema.String.annotate({ description: 'Optional angle, e.g. "commitments" or "recent activity".' }),
    ),
  }),
  output: Schema.Struct({
    summary: Schema.String,
    factCount: Schema.Number,
    /** Distinct source message DXNs the summarized facts were extracted from (for citation / opening). */
    sources: Schema.Array(Schema.String),
  }),
}).pipe(Operation.visible);

/** Default number of thread messages included in the {@link GenerateReply} prompt. */
export const DEFAULT_GENERATE_REPLY_THREAD_LIMIT = 5;

/** Default maximum number of facts included in the {@link GenerateReply} prompt. */
export const DEFAULT_GENERATE_REPLY_FACT_LIMIT = 20;

/**
 * Drafts a reply grounded on the thread and the facts the space knows about its participants.
 *
 * Lives here rather than in plugin-inbox because it needs the `FactStore` brain owns. The surfaces
 * that offer it are inbox's, so it reaches them through `InboxCapabilities.ReplyGenerator` — the
 * dependency runs brain → inbox and a direct call from the surface would invert it.
 */
export const GenerateReply = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.brain.generateReply'),
    name: 'Generate Reply',
    description:
      'Drafts a reply to an email, grounded on the thread context and facts the space fact store knows about the participants.',
    icon: 'ph--sparkle--regular',
  },
  services: [AiService.AiService, Database.Service, FactStore],
  // The shared contract, so a surface can invoke whatever is contributed without naming this plugin.
  input: ReplyGeneration.Input,
  output: ReplyGeneration.Output,
});
