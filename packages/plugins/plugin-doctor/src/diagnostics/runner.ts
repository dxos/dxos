//
// Copyright 2026 DXOS.org
//

import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { type Hypergraph } from '@dxos/echo';
import { type Space } from '@dxos/halo';

import { type DiagnosticContext, type DiagnosticProvider, type DiagnosticRunResult } from './types.ts';

export type RunDiagnosticsOptions = {
  readonly spaces: Space.ServiceApi;
  readonly graph: Hypergraph.Hypergraph;
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly providers: readonly DiagnosticProvider[];
  readonly signal: AbortSignal;
  readonly onProviderStart?: (provider: DiagnosticProvider, index: number, total: number) => void;
  readonly onProviderComplete?: (result: DiagnosticRunResult, index: number, total: number) => void;
  readonly onProgress?: (provider: DiagnosticProvider, message: string) => void;
};

/**
 * Run a list of diagnostic providers sequentially and return their aggregated results.
 * Errors thrown by individual providers are captured on the corresponding result rather
 * than aborting the run.
 */
export const runDiagnostics = async (options: RunDiagnosticsOptions): Promise<DiagnosticRunResult[]> => {
  const { spaces, graph, capabilities, providers, signal, onProviderStart, onProviderComplete, onProgress } = options;
  const results: DiagnosticRunResult[] = [];
  for (let index = 0; index < providers.length; index++) {
    if (signal.aborted) {
      break;
    }
    const provider = providers[index];
    onProviderStart?.(provider, index, providers.length);
    const startedAt = Date.now();
    const ctx: DiagnosticContext = {
      spaces,
      graph,
      capabilities,
      reportProgress: (message) => onProgress?.(provider, message),
      signal,
    };
    let result: DiagnosticRunResult;
    try {
      const issues = await provider.run(ctx);
      result = {
        providerId: provider.id,
        label: provider.label,
        issues,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      result = {
        providerId: provider.id,
        label: provider.label,
        issues: [],
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    results.push(result);
    onProviderComplete?.(result, index, providers.length);
  }
  return results;
};
