//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import { type DiagnosticProvider as DiagnosticProviderType } from '../diagnostics';

/**
 * Plugins contribute diagnostic providers via this capability.
 */
export const DiagnosticProvider = Capability.make<DiagnosticProviderType>(
  `${meta.profile.key}.capability.diagnostic-provider`,
);
