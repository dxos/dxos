//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { runAndForwardErrors } from '@dxos/effect';

import { App } from './app';
import { Core } from './core';

const main = Effect.gen(function* () {
  const services = yield* Effect.runtime<Core.AiChatServices>();
  const core = new Core.Core(services);
  const app = new App(core);
  yield* Effect.promise(() => app.initialize());
}).pipe(Effect.provide(Core.TestLayer));

void runAndForwardErrors(main);
