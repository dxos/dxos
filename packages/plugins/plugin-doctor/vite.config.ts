//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    skills: 'src/skills/index.ts',
    containers: 'src/containers/index.ts',
    diagnostics: 'src/diagnostics/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    DoctorCapabilities: 'src/types/DoctorCapabilities.ts',
    DoctorEvents: 'src/types/DoctorEvents.ts',
    DoctorOperation: 'src/types/DoctorOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
