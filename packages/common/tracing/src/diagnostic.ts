//
// Copyright 2024 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import { type TraceDiagnosticParams, type TraceDiagnostic } from './api';
import { createId } from './util';

export const DIAGNOSTICS_TIMEOUT = 10_000;

export type DiagnosticMetadata = {
  id: string;
  instanceId: string;
  name: string;
};

export type DiagnosticsRequest = {
  id: string;
  instanceId: string;
};

export type DiagnosticsData = {
  id: string;
  instanceId: string;
  data: any;
  error?: string;
};

export class TraceDiagnosticImpl implements TraceDiagnostic {
  constructor(
    public id: string,
    public fetch: () => any,
    public name: string,
    private readonly _onUnregister: () => void,
  ) {}

  unregister(): void {
    this._onUnregister();
  }
}

export class DiagnosticsManager {
  readonly instanceId = createId();

  readonly registry = new Map<string, TraceDiagnosticImpl>();

  registerDiagnostic(params: TraceDiagnosticParams<any>): TraceDiagnostic {
    const impl = new TraceDiagnosticImpl(params.id, params.fetch, params.name ?? params.id, () => {
      if (this.registry.get(params.id) === impl) {
        this.registry.delete(params.id);
      }
    });
    this.registry.set(params.id, impl);
    return impl;
  }

  list(): DiagnosticMetadata[] {
    return Array.from(this.registry.values()).map((diagnostic) => ({
      id: diagnostic.id,
      instanceId: this.instanceId,
      name: diagnostic.name,
    }));
  }

  async fetch(request: DiagnosticsRequest): Promise<DiagnosticsData> {
    invariant(request.instanceId === this.instanceId, 'Invalid instance id');
    const { id } = request;
    const diagnostic = this.registry.get(id);
    invariant(diagnostic, 'Diagnostic not found');
    try {
      const data = await asyncTimeout(diagnostic.fetch(), DIAGNOSTICS_TIMEOUT);
      return {
        id,
        instanceId: this.instanceId,
        data,
      };
    } catch (err: any) {
      return {
        id,
        instanceId: this.instanceId,
        data: null,
        error: err.stack,
      };
    }
  }
}
