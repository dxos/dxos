//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '{{ workspace_root | path_join(part = 'vitest.base.config') | path_relative(from = dest_dir) }}';

export default mergeConfig(baseConfig({ cwd: __dirname }), defineConfig({}));
