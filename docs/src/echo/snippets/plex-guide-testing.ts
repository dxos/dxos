//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as Harness from '@dxos/plugin-testing/Harness';

import { make as makePlugin } from '../../plex-tutorial/dx.config.ts';
import { make } from '../../plex-tutorial/src/types/StashedLink.ts';
import { MarkRead } from '../../plex-tutorial/src/types/StashedLinkOperation.ts';

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
// An operation that reads a space needs a client, an identity and the space's id.
await using app = await Harness.createComposerTestApp({
  plugins: [ClientPlugin.make({}), makePlugin()],
});
const { defaultSpace } = await EffectEx.runAndForwardErrors(
  initializeIdentity(app.get(ClientCapabilities.Client)),
);

const link = defaultSpace.db.add(
  make({ title: 'DXOS', url: 'https://dxos.org' }),
);
await app.runPromise(
  Operation.invoke(
    MarkRead,
    { link: Ref.make(link) },
    { spaceId: defaultSpace.id },
  ),
);
console.log(link.read); // true
// #endregion
