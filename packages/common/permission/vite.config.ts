//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Check: 'src/Check.ts',
    Command: 'src/Command.ts',
    Consent: 'src/Consent.ts',
    Grant: 'src/Grant.ts',
    Permission: 'src/Permission.ts',
    Policy: 'src/Policy.ts',
    Principal: 'src/Principal.ts',
    Requirement: 'src/Requirement.ts',
    Revocation: 'src/Revocation.ts',
    Subject: 'src/Subject.ts',
  },
  test: { node: true },
});
