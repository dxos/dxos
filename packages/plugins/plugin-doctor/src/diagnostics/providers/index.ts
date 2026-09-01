//
// Copyright 2026 DXOS.org
//

import { type DiagnosticProvider } from '../types.ts';
import { danglingRefsDiagnostic } from './dangling-refs.ts';
import { operationsServicesDiagnostic } from './operations.ts';
import { schemaDiagnostic } from './schema.ts';
import { skillToolsDiagnostic } from './skills.ts';

export { skillToolsDiagnostic } from './skills.ts';
export { danglingRefsDiagnostic } from './dangling-refs.ts';
export { KNOWN_SERVICES, operationsServicesDiagnostic } from './operations.ts';
export { schemaDiagnostic } from './schema.ts';

/**
 * Built-in diagnostic providers contributed by the doctor plugin.
 * Other plugins can contribute additional providers via `DoctorCapabilities.DiagnosticProvider`.
 */
export const builtInDiagnostics: readonly DiagnosticProvider[] = [
  schemaDiagnostic,
  danglingRefsDiagnostic,
  operationsServicesDiagnostic,
  skillToolsDiagnostic,
];
