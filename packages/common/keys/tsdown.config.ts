// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  importGlobals: true,
  bundlePackages: ['base32-decode', 'base32-encode', 'to-data-view'],
});
