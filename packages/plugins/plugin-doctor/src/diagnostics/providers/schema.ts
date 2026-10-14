//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

import { meta } from '#meta';

import { getReadyDatabases, labelObject, queryAllObjects } from '../helpers.ts';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types.ts';

/**
 * Validate every ECHO object against its declared schema and surface objects whose
 * runtime shape does not match the schema (missing required fields, wrong types, etc.).
 */
export const schemaDiagnostic: DiagnosticProvider = {
  id: 'schema',
  label: ['diagnostic.schema.label', { ns: meta.profile.key }],
  description: ['diagnostic.schema.description', { ns: meta.profile.key }],
  run: async ({ spaces, graph, reportProgress, signal }) => {
    const issues: DiagnosticIssue[] = [];
    const databases = await getReadyDatabases({ spaces, graph });
    for (const db of databases) {
      if (signal.aborted) {
        break;
      }
      reportProgress(db.spaceId);
      const objects = await queryAllObjects(db);
      for (const obj of objects) {
        if (signal.aborted) {
          break;
        }
        const type = Obj.getType(obj);
        if (!type) {
          // Untyped documents and some system objects legitimately have no schema —
          // surface as 'info' rather than 'warning' to keep the signal/noise ratio reasonable.
          issues.push({
            id: `${db.spaceId}:${(obj as { id?: string }).id ?? 'unknown'}:no-schema`,
            severity: 'info',
            message: `Object has no resolvable schema (${Obj.getTypename(obj) ?? 'unknown type'}).`,
            subjectLabel: labelObject(obj),
            spaceId: db.spaceId,
          });
          continue;
        }
        const result = Schema.decodeUnknownResult(Schema.toType(Type.getSchema(type)))(obj);
        if (Result.isFailure(result)) {
          issues.push({
            id: `${db.spaceId}:${(obj as { id?: string }).id ?? 'unknown'}:schema-mismatch`,
            severity: 'error',
            message: `Schema mismatch: ${result.failure.message}`,
            subjectLabel: labelObject(obj),
            spaceId: db.spaceId,
          });
        }
      }
    }
    return issues;
  },
};
