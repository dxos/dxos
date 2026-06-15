//
// Copyright 2026 DXOS.org
//

import { type DiagnosticProvider } from '../types';
import { blueprintToolsDiagnostic } from './blueprints';
import { danglingRefsDiagnostic } from './dangling-refs';
import { operationsServicesDiagnostic } from './operations';
import { schemaDiagnostic } from './schema';

export { blueprintToolsDiagnostic } from './blueprints';
export { danglingRefsDiagnostic } from './dangling-refs';
export { KNOWN_SERVICES, operationsServicesDiagnostic } from './operations';
export { schemaDiagnostic } from './schema';

/**
 * Built-in diagnostic providers contributed by the doctor plugin.
 * Other plugins can contribute additional providers via `DoctorCapabilities.DiagnosticProvider`.
 */
export const builtInDiagnostics: readonly DiagnosticProvider[] = [
  schemaDiagnostic,
  danglingRefsDiagnostic,
  operationsServicesDiagnostic,
  blueprintToolsDiagnostic,
];
