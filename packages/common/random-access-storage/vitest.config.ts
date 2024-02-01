//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

// @ts-ignore
import configShared from '../../../vitest.shared';

export default mergeConfig(configShared, defineConfig({}));
