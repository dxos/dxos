//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';

import { meta } from '#meta';

import { getReadyDatabases, labelObject, queryAllObjects } from '../helpers.ts';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types.ts';

/**
 * Walk all properties of every object in every space, collect Ref values and try to load
 * each one. References that fail to resolve are reported as dangling.
 */
export const danglingRefsDiagnostic: DiagnosticProvider = {
  id: 'dangling-refs',
  label: ['diagnostic.dangling-refs.label', { ns: meta.profile.key }],
  description: ['diagnostic.dangling-refs.description', { ns: meta.profile.key }],
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
        const refs = collectRefs(obj);
        for (const { path, ref } of refs) {
          if (signal.aborted) {
            break;
          }
          try {
            const target = await ref.tryLoad();
            if (!target) {
              issues.push({
                id: `${db.spaceId}:${(obj as { id?: string }).id ?? 'unknown'}:${path.join('.')}:dangling`,
                severity: 'error',
                message: `Dangling reference at "${path.join('.')}" → ${ref.uri}.`,
                subjectLabel: labelObject(obj),
                spaceId: db.spaceId,
              });
            }
          } catch (error) {
            issues.push({
              id: `${db.spaceId}:${(obj as { id?: string }).id ?? 'unknown'}:${path.join('.')}:error`,
              severity: 'error',
              message: `Failed to resolve reference at "${path.join('.')}": ${
                error instanceof Error ? error.message : String(error)
              }.`,
              subjectLabel: labelObject(obj),
              spaceId: db.spaceId,
            });
          }
        }
      }
    }
    return issues;
  },
};

type CollectedRef = { readonly path: readonly string[]; readonly ref: Ref.Unknown };

const collectRefs = (root: unknown): CollectedRef[] => {
  const collected: CollectedRef[] = [];
  const visited = new WeakSet<object>();
  const visit = (value: unknown, path: readonly string[]) => {
    if (value == null) {
      return;
    }
    if (Ref.isRef(value)) {
      collected.push({ path, ref: value });
      return;
    }
    if (typeof value !== 'object') {
      return;
    }
    if (visited.has(value)) {
      return;
    }
    visited.add(value);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        visit(value[index], [...path, String(index)]);
      }
      return;
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'id') {
        continue;
      }
      visit(nested, [...path, key]);
    }
  };
  visit(root, []);
  return collected;
};
