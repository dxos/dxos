//
// Copyright 2026 DXOS.org
//

import { Capabilities } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Skill, Operation } from '@dxos/compute';
import { Filter, Obj } from '@dxos/echo';

import { meta } from '#meta';

import { getReadySpaces } from '../helpers';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types';

/**
 * Scan saved skills and flag any that reference tools that cannot be resolved
 * by any of:
 *   - `AppCapabilities.Toolkit` contributions (toolkit-defined tools)
 *   - `Capabilities.OperationHandler` registrations (operations exposed as tools)
 *   - saved `Operation.PersistentOperation` records in any space (deployed operations)
 */
export const skillToolsDiagnostic: DiagnosticProvider = {
  id: 'skill-tools',
  label: ['diagnostic.skill-tools.label', { ns: meta.profile.key }],
  description: ['diagnostic.skill-tools.description', { ns: meta.profile.key }],
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

    // Walk skills and flag any unresolved tool references.
    for (const space of spaces) {
      if (signal.aborted) {
        break;
      }
      reportProgress(space.id);
      const skills = await space.db.query(Filter.type(Skill.Skill)).run();
      for (const skill of skills) {
        if (signal.aborted) {
          break;
        }
        const unknownTools = (skill.tools ?? []).filter((tool: string) => !knownTools.has(tool));
        if (unknownTools.length > 0) {
          const skillKey = Obj.getMeta(skill).key;
          const label = skill.name || skillKey || skill.id;
          issues.push({
            id: `${space.id}:${skill.id}:unknown-tools`,
            severity: 'warning',
            message: `Skill "${label}" references unknown tool(s): ${unknownTools.join(', ')}.`,
            subjectLabel: skillKey ?? skill.id,
            spaceId: space.id,
          });
        }
      }
    }
    return issues;
  },
};
