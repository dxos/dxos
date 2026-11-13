//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Harness from '@dxos/plugin-testing/Harness';

import config from '../dx.config.ts';

// #region harness
// Boots a headless Composer with only this plugin and the core plugins it
// needs.
await using harness = await Harness.createComposerTestApp({
  plugins: [config.make()],
});

// Mark as read needs a space, which the harness has none of, so this checks that
// the plugin contributes its handlers.
const handlers = await harness.waitForCapability(Capabilities.OperationHandler);
console.log(typeof handlers);
// #endregion
