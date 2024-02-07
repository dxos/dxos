//
// Copyright 2023 DXOS.org
//

import { type PlaywrightTestConfig } from '@playwright/test';

import { defaultPlaywrightConfig } from '@dxos/test/playwright';

const config: PlaywrightTestConfig = { ...defaultPlaywrightConfig, workers: 3 };

export default config;
