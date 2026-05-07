//
// Copyright 2026 DXOS.org
//

import { AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/compute';
import { Filter } from '@dxos/echo';

import { meta } from '#meta';

import { getReadySpaces } from '../helpers';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types';

/**
 * Scan saved blueprints and flag any that reference tools not registered in the
 * union of all `AppCapabilities.Toolkit` contributions.
 */
export const blueprintToolsDiagnostic: DiagnosticProvider = {
  id: 'blueprint-tools',
  label: `${meta.id}.diagnostic.blueprint-tools.label`,
  description: `${meta.id}.diagnostic.blueprint-tools.description`,
  run: async ({ client, capabilities, reportProgress, signal }) => {
    const issues: DiagnosticIssue[] = [];
    const knownTools = new Set<string>();
    for (const toolkit of capabilities.getAll(AppCapabilities.Toolkit)) {
      for (const name of Object.keys(toolkit.toolkit.tools)) {
        knownTools.add(name);
      }
    }

    const spaces = getReadySpaces(client);
    for (const space of spaces) {
      if (signal.aborted) {
        break;
      }
      reportProgress(space.id);
      const blueprints = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
      for (const blueprint of blueprints) {
        const unknown = (blueprint.tools ?? []).filter((tool: string) => !knownTools.has(tool));
        if (unknown.length > 0) {
          const label = blueprint.name || blueprint.key || blueprint.id;
          issues.push({
            id: `${space.id}:${blueprint.id}:unknown-tools`,
            severity: 'warning',
            message: `Blueprint "${label}" references unknown tool(s): ${unknown.join(', ')}.`,
            subjectLabel: blueprint.key ?? blueprint.id,
            spaceId: space.id,
          });
        }
      }
    }
    return issues;
  },
};
