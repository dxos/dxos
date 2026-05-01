//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { trim } from '@dxos/util';

const LevelLetter = Schema.Literal('T', 'D', 'V', 'I', 'W', 'E');
const SelectField = Schema.Literal('t', 'l', 'm', 'f', 'n', 'o', 'c', 'i', 'e');

const GroupBy = Schema.Union(
  Schema.Literal('level', 'message', 'file', 'tabId'),
  Schema.TemplateLiteral('context.', Schema.String),
);

const Aggregate = Schema.Literal('count', 'sample', 'firstLast');
const Order = Schema.Literal('asc', 'desc');
const Format = Schema.Literal('json', 'jsonl', 'pretty');

const TimeBound = Schema.Union(Schema.String, Schema.Number);

const QueryComposerLogsInput = Schema.Struct({
  filters: Schema.optional(
    Schema.Array(Schema.String).annotations({
      description: trim`
        LOG_FILTER strings; OR across array entries. Same syntax as DX_LOG / @dxos/log
        parseFilter — comma-separated tokens of "<pattern>:<level>", a bare "<level>",
        or "!<pattern>" to exclude. Tokens within one entry combine like @dxos/log
        shouldLog (include/exclude); multiple entries OR.
      `,
      examples: [['info'], ['warn', 'echo-pipeline:debug'], ['debug,!rpc']],
    }),
  ),
  grep: Schema.optional(
    Schema.Array(Schema.String).annotations({
      description: trim`
        JavaScript RegExp sources tested AND-wise against the full JSON line. Use
        sparingly; prefer "filters" or "messageRegex" when possible.
      `,
      examples: [['ProcessManager'], ['lifecycle', 'shutdown']],
    }),
  ),
  messageRegex: Schema.optional(
    Schema.String.annotations({
      description: 'Regex applied to the message field only. Convenience over "grep".',
      examples: ['^Failed to', 'Query'],
    }),
  ),
  since: Schema.optional(
    TimeBound.annotations({
      description: 'Inclusive lower bound. ISO 8601 string or epoch milliseconds.',
      examples: ['2026-01-01T00:00:00Z', 1735689600000],
    }),
  ),
  until: Schema.optional(
    TimeBound.annotations({
      description: 'Inclusive upper bound. ISO 8601 string or epoch milliseconds.',
    }),
  ),
  levels: Schema.optional(
    Schema.Array(LevelLetter).annotations({
      description: 'Allow-list of short level letters (T,D,V,I,W,E). Empty/undefined = all.',
      examples: [['W', 'E']],
    }),
  ),
  tabId: Schema.optional(
    Schema.String.annotations({
      description:
        'Filter by `i` (environment / tab id; output of inferEnvironmentName).',
    }),
  ),
  select: Schema.optional(
    Schema.Array(SelectField).annotations({
      description: 'Fields to keep on projected entries. Default: all.',
      examples: [['t', 'l', 'm']],
    }),
  ),
  groupBy: Schema.optional(
    GroupBy.annotations({
      description: trim`
        Group results by one of: "level", "message", "file", "tabId", or
        "context.<key>" to read the parsed "c" JSON object (single level).
      `,
      examples: ['level', 'message', 'context.debugLabel'],
    }),
  ),
  aggregate: Schema.optional(
    Aggregate.annotations({
      description: 'What to compute per group. Default "count".',
    }),
  ),
  sampleSize: Schema.optional(
    Schema.Number.annotations({
      description: 'Max samples per bucket when aggregate=sample. Default 3, max 25.',
    }),
  ),
  topK: Schema.optional(
    Schema.Number.annotations({
      description: 'Keep top N groups by count. Default 50, max 1000.',
    }),
  ),
  limit: Schema.optional(
    Schema.Number.annotations({
      description: 'Max raw entries returned when no aggregate. Default 100, max 1000.',
    }),
  ),
  order: Schema.optional(
    Order.annotations({
      description: '"asc" (oldest first) or "desc" (newest first). Default "asc".',
    }),
  ),
  format: Schema.optional(
    Format.annotations({
      description: trim`
        Output format for "entries". Default "json". "pretty" mirrors
        scripts/query-logs.mjs formatLine output for human reading.
      `,
    }),
  ),
  dbName: Schema.optional(
    Schema.String.annotations({
      description: 'Override IDB name for testing. Defaults to composer-app LOG_STORE_DB_NAME.',
    }),
  ),
});

const GroupOutput = Schema.Struct({
  key: Schema.String,
  count: Schema.Number,
  samples: Schema.optional(Schema.Array(Schema.Unknown)),
  first: Schema.optional(Schema.String),
  last: Schema.optional(Schema.String),
});

const QueryComposerLogsOutput = Schema.Struct({
  total: Schema.Number.annotations({ description: 'Number of records read from IDB before filtering.' }),
  matched: Schema.Number.annotations({ description: 'Number that passed all filters.' }),
  elapsedMs: Schema.Number.annotations({ description: 'Wall time in milliseconds.' }),
  truncated: Schema.Boolean.annotations({
    description: 'True if `entries` was truncated by `limit`, or buckets by `topK`.',
  }),
  entries: Schema.optional(
    Schema.Array(Schema.Unknown).annotations({
      description: 'Present iff no `groupBy`. Max length = effective `limit`.',
    }),
  ),
  groups: Schema.optional(
    Schema.Array(GroupOutput).annotations({
      description: 'Present iff `groupBy` is set, sorted by count descending.',
    }),
  ),
});

export const QueryComposerLogs = Operation.make({
  meta: {
    key: 'org.dxos.function.doctor.query-composer-logs',
    name: 'Query Composer Logs',
    description: trim`
      Query the local browser tab's own NDJSON log store (the one populated by
      @dxos/log-store-idb). Use this when the user reports a bug, an unexpected
      behavior, or asks "what just happened". Supports filter expressions
      (LOG_FILTER syntax), regex grep, time bounds, level allow-list, field
      projection, group-by + count/sample/firstLast aggregation, top-K, limit, and
      ordering.

      Examples:
      - Last 20 errors and warnings:
        { "filters": ["warn"], "order": "desc", "limit": 20 }
      - Recent ECHO query activity:
        { "filters": ["echo-pipeline:debug"], "messageRegex": "Query", "limit": 50 }
      - Top 10 noisiest messages in the last 5 minutes:
        { "since": <now-300000>, "groupBy": "message", "topK": 10 }
      - Counts by log level for triage:
        { "groupBy": "level", "aggregate": "count" }
      - First/last occurrence per source file:
        { "groupBy": "file", "aggregate": "firstLast" }
      - Sample three entries per debugLabel from query traces:
        { "filters": ["echo-db:debug"], "groupBy": "context.debugLabel",
          "aggregate": "sample", "sampleSize": 3 }
      - RPC noise excluded, plain text output:
        { "filters": ["debug,!rpc"], "format": "pretty", "limit": 100 }
    `,
  },
  input: QueryComposerLogsInput,
  output: QueryComposerLogsOutput,
});
