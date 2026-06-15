//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

import { meta } from '#meta';

import { getReadySpaces, labelObject, queryAllObjects } from '../helpers';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types';

/**
 * Validate every ECHO object against its declared schema and surface objects whose
 * runtime shape does not match the schema (missing required fields, wrong types, etc.).
 */
export const schemaDiagnostic: DiagnosticProvider = {
  id: 'schema',
  label: ['diagnostic.schema.label', { ns: meta.id }],
  description: ['diagnostic.schema.description', { ns: meta.id }],
  run: async ({ client, reportProgress, signal }) => {
    const issues: DiagnosticIssue[] = [];
    const spaces = getReadySpaces(client);
    for (const space of spaces) {
      if (signal.aborted) {
        break;
      }
      reportProgress(space.id);
      const objects = await queryAllObjects(space);
      for (const obj of objects) {
        if (signal.aborted) {
          break;
        }
        const type = Obj.getType(obj);
        if (!type) {
          // Untyped documents and some system objects legitimately have no schema —
          // surface as 'info' rather than 'warning' to keep the signal/noise ratio reasonable.
          issues.push({
            id: `${space.id}:${(obj as { id?: string }).id ?? 'unknown'}:no-schema`,
            severity: 'info',
            message: `Object has no resolvable schema (${Obj.getTypename(obj) ?? 'unknown type'}).`,
            subjectLabel: labelObject(obj),
            spaceId: space.id,
          });
          continue;
        }
        const result = Schema.validateEither(Type.getSchema(type))(obj);
        if (Either.isLeft(result)) {
          issues.push({
            id: `${space.id}:${(obj as { id?: string }).id ?? 'unknown'}:schema-mismatch`,
            severity: 'error',
            message: `Schema mismatch: ${result.left.message}`,
            subjectLabel: labelObject(obj),
            spaceId: space.id,
          });
        }
      }
    }
    return issues;
  },
};
