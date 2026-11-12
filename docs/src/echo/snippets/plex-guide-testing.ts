//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Ref } from '@dxos/echo';
import * as Harness from '@dxos/plugin-testing/Harness';

import { make as makePlugin } from '../../app-framework-tutorial/dx.config.ts';
import { make } from '../../app-framework-tutorial/src/types/StashedLink.ts';
import { MarkRead } from '../../app-framework-tutorial/src/types/StashedLinkOperation.ts';

// #region boot
// A headless app with the core plugins Composer gives a plugin, plus this one.
await using harness = await Harness.createComposerTestApp({
  plugins: [makePlugin()],
});
// #endregion

// #region events
// Startup has fired; modules gated on later events wait until the test fires them.
await harness.fire(ActivationEvents.Idle);
const builders = harness.getAll(AppCapabilities.AppGraphBuilder);
console.log(builders.length > 0); // true
// #endregion

// #region capabilities
const schemas = harness.getAll(AppCapabilities.Schema).flat();
const handlers = await harness.waitForCapability(Capabilities.OperationHandler);
console.log(schemas.length, typeof handlers);
// #endregion

// #region invoke
const link = make({ title: 'DXOS', url: 'https://dxos.org' });
await harness.invoke(MarkRead, { link: Ref.make(link) });
console.log(link.read);
// #endregion
