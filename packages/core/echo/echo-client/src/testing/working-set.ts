//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';

import { type WorkingSetReport, type WorkingSetRow, type WorkingSetService } from '@dxos/protocols';
import { type QueryService } from '@dxos/protocols/rpc';

import { type EchoTestPeer } from './echo-test-builder.ts';

/** A working set kept in memory, as an EDGE owner keeps it in its storage: one row per document, and every report. */
export const makeTestWorkingSet = (initial: readonly WorkingSetRow[] = []) => {
  const rows = new Map(initial.map((row) => [row.documentId, row]));
  const puts: WorkingSetReport[] = [];
  const service: WorkingSetService = {
    get: async () => ({ rows: [...rows.values()] }),
    put: async (report) => {
      puts.push(report);
      report.rows.forEach((row) => rows.set(row.documentId, row));
    },
  };
  /** The objects the working set holds, one per row that names one. */
  const objects = () => [...rows.values()].flatMap((row) => (row.objectId === undefined ? [] : [row.objectId]));
  return { service, rows, puts, objects };
};

/** A host's query service whose answers leave out the objects `hide` matches, as an index that has not caught up. */
export const hidingQueryService = (
  host: EchoTestPeer['host']['queryService'],
  hide: (id: string | undefined) => boolean,
): QueryService.Handlers => ({
  'QueryService.setConfig': (request) => host['QueryService.setConfig'](request),
  'QueryService.reindex': () => host['QueryService.reindex'](),
  'QueryService.execQuery': (request) =>
    host['QueryService.execQuery'](request).pipe(
      Stream.map((response) => ({ ...response, results: response.results?.filter((result) => !hide(result.id)) })),
    ),
});
