//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { builtInDiagnostics } from '#diagnostics';
import { DoctorCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return builtInDiagnostics.map((provider) => Capability.contribute(DoctorCapabilities.DiagnosticProvider, provider));
  }),
);
