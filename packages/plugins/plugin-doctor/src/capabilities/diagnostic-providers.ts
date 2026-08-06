//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { builtInDiagnostics } from '#diagnostics';

import * as DoctorCapabilities from '../types/DoctorCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return builtInDiagnostics.map((provider) => Capability.contribute(DoctorCapabilities.DiagnosticProvider, provider));
  }),
);
