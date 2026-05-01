//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { QueryComposerLogs } from './definitions';
import {
  HARD_LIMIT_ENTRIES,
  type LogRecord,
  type QueryInput,
  runQuery,
} from './internal/log-query';
import { readLogRows } from './internal/log-reader';

// TODO(plugin-doctor): add an AssistantTestLayer end-to-end test that exercises
// the tool through Operation.invoke once a fake IDB is available in test deps.

export default QueryComposerLogs.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      const start = Date.now();
      const records: LogRecord[] = [];
      const queryInput = input as QueryInput;
      const direction: 'next' | 'prev' =
        !queryInput.groupBy && queryInput.order === 'desc' ? 'prev' : 'next';
      const limit = Math.min(queryInput.limit ?? 100, HARD_LIMIT_ENTRIES);

      const opened = yield* Effect.tryPromise({
        try: () =>
          readLogRows({
            dbName: queryInput.dbName,
            direction,
            onRow: (row) => {
              try {
                const record = JSON.parse(row.line) as LogRecord;
                records.push(record);
                // Cheap early exit when we know we won't need more rows.
                // Filtering still happens in runQuery, but bounding the read keeps memory
                // and time linear in the requested output for non-aggregating queries.
                if (
                  !queryInput.groupBy &&
                  !queryInput.filters?.length &&
                  !queryInput.grep?.length &&
                  !queryInput.messageRegex &&
                  !queryInput.levels?.length &&
                  !queryInput.tabId &&
                  queryInput.since === undefined &&
                  queryInput.until === undefined &&
                  records.length >= limit
                ) {
                  return false;
                }
              } catch {
                // Malformed rows are accounted for via runQuery's `total` skip path
                // — we still push so that the count reflects what the store held.
                records.push({});
              }
              return undefined;
            },
          }),
        catch: (err) => err,
      }).pipe(
        Effect.catchAll((err) =>
          Effect.sync(() => {
            log.warn('plugin-doctor: log-reader threw', { err });
            return { total: 0, opened: false } as const;
          }),
        ),
      );

      if (!opened.opened) {
        return {
          total: 0,
          matched: 0,
          elapsedMs: Date.now() - start,
          truncated: false,
        };
      }

      return runQuery(records, queryInput);
    }),
  ),
  Operation.opaqueHandler,
);
