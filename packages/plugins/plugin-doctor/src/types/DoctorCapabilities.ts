//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';

import { type DiagnosticProvider as DiagnosticProviderType } from '#diagnostics';

import { DoctorNamespace } from '../namespace.ts';

/**
 * Plugins contribute diagnostic providers via this capability.
 */
export const DiagnosticProvider = Capability.make<DiagnosticProviderType>()(
  `${DoctorNamespace.key}.capability.diagnosticProvider`,
);
