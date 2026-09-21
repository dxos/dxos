//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { builtInDiagnostics } from '#diagnostics';
import { DoctorCapabilities } from '#types';
import { DoctorEvents } from '#types';

export const DiagnosticProviders = Capability.makeModule(
  'DiagnosticProviders',
  { provides: [DoctorCapabilities.DiagnosticProvider], activatesOn: DoctorEvents.Start },
  Effect.fnUntraced(function* () {
    return builtInDiagnostics.map((provider) => Capability.contribute(DoctorCapabilities.DiagnosticProvider, provider));
  }),
);
