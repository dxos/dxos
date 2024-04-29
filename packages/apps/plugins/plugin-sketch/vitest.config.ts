//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import configShared from '../../../../vitest.shared';
import react from "@vitejs/plugin-react-swc";

export default mergeConfig(
  configShared,
  defineConfig({
    plugins: [react()],
  }));
