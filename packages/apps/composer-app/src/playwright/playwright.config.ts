//
// Copyright 2023 DXOS.org
//

import { type PlaywrightTestConfig } from '@playwright/test';

import { defaultPlaywrightConfig } from '@dxos/test/playwright';

// TODO(wittjosiah): Sometimes seems to take a long time to hit this in CI.
const config: PlaywrightTestConfig = { ...defaultPlaywrightConfig, timeout: 60_000 };

export default config;
