//
// Copyright 2026 DXOS.org
//

import { AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import { Credential, Operation, StorageService, Trace } from '@dxos/compute';
import { Database, Filter, Obj, Registry } from '@dxos/echo';
import { FunctionInvocationService } from '@dxos/compute-runtime';

import { meta } from '#meta';

import { getReadySpaces } from '../helpers';
import { type DiagnosticIssue, type DiagnosticProvider } from '../types';

/**
 * Services known to be available to operations at invocation time.
 * Mirrors the `FunctionServices` union plus a few extras commonly declared in
 * operations across the repo. Keys are derived from the canonical `Context.Tag`
 * definitions so refactors of those tags propagate here automatically.
 */
export const KNOWN_SERVICES: ReadonlySet<string> = new Set(
  [
    Harness.HarnessService,
    AiService.AiService,
    Registry.Service,
    Credential.CredentialsService,
    Database.Service,
    FunctionInvocationService,
    Operation.Service,
    StorageService.StorageService,
    Trace.TraceService,
  ].map((tag) => tag.key),
);

/**
 * Scan saved operations and flag any that request a service not present in the whitelist.
 */
export const operationsServicesDiagnostic: DiagnosticProvider = {
  id: 'operations-services',
  label: ['diagnostic.operations-services.label', { ns: meta.profile.key }],
  description: ['diagnostic.operations-services.description', { ns: meta.profile.key }],
  run: async ({ client, reportProgress, signal }) => {
    const issues: DiagnosticIssue[] = [];
    const spaces = getReadySpaces(client);
    for (const space of spaces) {
      if (signal.aborted) {
        break;
      }
      reportProgress(space.id);
      const operations = await space.db.query(Filter.type(Operation.PersistentOperation)).run();
      for (const operation of operations) {
        if (signal.aborted) {
          break;
        }
        const services = operation.services ?? [];
        const unknownServices = services.filter((service: string) => !KNOWN_SERVICES.has(service));
        if (unknownServices.length > 0) {
          const operationKey = Obj.getMeta(operation).key;
          const label = operation.name || operationKey || operation.id;
          issues.push({
            id: `${space.id}:${operation.id}:unknown-services`,
            severity: 'error',
            message: `Operation "${label}" requests unknown service(s): ${unknownServices.join(', ')}.`,
            subjectLabel: operationKey ?? operation.id,
            spaceId: space.id,
          });
        }
      }
    }
    return issues;
  },
};
