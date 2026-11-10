//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/echo';
import * as Harness from '@dxos/plugin-testing/Harness';

// #region meta
const meta = Plugin.makeMeta({
  key: DXN.make('com.example.plugin.hello'),
  name: 'Hello',
  description: 'Contributes one greeting.',
});
// #endregion

// #region module
const Greeting = Capability.make<string>()('com.example.plugin.hello.capability.greeting');

const GreetingModule = Capability.inlineModule(
  'Greeting',
  { provides: [Greeting], activatesOn: ActivationEvents.Startup },
  () => Effect.succeed(Capability.contribute(Greeting, 'Hello, world')),
);
// #endregion

// #region define
export const HelloPlugin = Plugin.define(meta).pipe(Plugin.addModule(GreetingModule), Plugin.make);
// #endregion

// #region lazy
// The module body loads only when its event fires. The loader's default export is checked against `provides`.
const LazyGreetingModule = Capability.lazyModule(
  'LazyGreeting',
  { provides: [Greeting], activatesOn: ActivationEvents.Idle },
  async () => ({
    default: Capability.makeModule(() => Effect.succeed(Capability.contribute(Greeting, 'Hello, later'))),
  }),
);
// #endregion

void LazyGreetingModule;

// #region test
await using harness = await Harness.createComposerTestApp({ plugins: [HelloPlugin()] });
console.log(harness.getAll(Greeting)); // ['Hello, world']
// #endregion
