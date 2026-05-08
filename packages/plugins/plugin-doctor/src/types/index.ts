//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { type DiagnosticProvider } from '../diagnostics';
import { meta } from '../meta';

export namespace DoctorCapabilities {
  /**
   * Plugins contribute diagnostic providers via this capability. The doctor's
   * R0 panel runs every contributed provider and surfaces the resulting issues.
   */
  export const DiagnosticProvider = Capability.make<DiagnosticProvider>(`${meta.id}.capability.diagnostic-provider`);
}
