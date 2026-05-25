//
// Copyright 2026 DXOS.org
//

import { Capabilities } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Operation } from '@dxos/compute';
import { Filter, Obj } from '@dxos/echo';

import { meta } from '#meta';

import { getReadySpaces } from '../helpers';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types';

/**
 * Scan saved blueprints and flag any that reference tools that cannot be resolved
 * by any of:
 *   - `AppCapabilities.Toolkit` contributions (toolkit-defined tools)
 *   - `Capabilities.OperationHandler` registrations (operations exposed as tools)
 *   - saved `Operation.PersistentOperation` records in any space (deployed operations)
 */
export const blueprintToolsDiagnostic: DiagnosticProvider = {
  id: 'blueprint-tools',
  label: ['diagnostic.blueprint-tools.label', { ns: meta.id }],
  description: ['diagnostic.blueprint-tools.description', { ns: meta.id }],
  run: async ({ client, capabilities, reportProgress, signal }) => {
    const issues: DiagnosticIssue[] = [];
    const knownTools = new Set<string>();

    // Tools contributed by toolkit capabilities.
    for (const toolkit of capabilities.getAll(AppCapabilities.Toolkit)) {
      for (const name of Object.keys(toolkit.toolkit.tools ?? {})) {
        knownTools.add(name);
      }
    }

    // Operations registered as handlers — their meta.key is usable as a tool id.
    const handlerSets = capabilities.getAll(Capabilities.OperationHandler);
    const handlerLists = await Promise.all(handlerSets.map((set) => set.getHandlers().catch(() => [])));
    for (const handlers of handlerLists) {
      for (const handler of handlers) {
        if (handler.meta?.key) {
          knownTools.add(handler.meta.key);
        }
      }
    }

    const spaces = getReadySpaces(client);

    // Saved (deployed) operations across all spaces.
    for (const space of spaces) {
      if (signal.aborted) {
        break;
      }
      const persisted = await space.db.query(Filter.type(Operation.PersistentOperation)).run();
      for (const op of persisted) {
        const opKey = Obj.getMeta(op).key;
        if (opKey) {
          knownTools.add(opKey);
        }
      }
    }

    // Walk blueprints and flag any unresolved tool references.
    for (const space of spaces) {
      if (signal.aborted) {
        break;
      }
      reportProgress(space.id);
      const blueprints = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
      for (const blueprint of blueprints) {
        if (signal.aborted) {
          break;
        }
        const unknownTools = (blueprint.tools ?? []).filter((tool: string) => !knownTools.has(tool));
        if (unknownTools.length > 0) {
          const blueprintKey = Obj.getMeta(blueprint).key;
          const label = blueprint.name || blueprintKey || blueprint.id;
          issues.push({
            id: `${space.id}:${blueprint.id}:unknown-tools`,
            severity: 'warning',
            message: `Blueprint "${label}" references unknown tool(s): ${unknownTools.join(', ')}.`,
            subjectLabel: blueprintKey ?? blueprint.id,
            spaceId: space.id,
          });
        }
      }
    }
    return issues;
  },
};
