//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { GenericToolkit } from '@dxos/assistant';
import { WebSearchToolkit } from '@dxos/assistant-toolkit';

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(AppCapabilities.Toolkit, GenericToolkit.make(WebSearchToolkit, Layer.empty))]),
);
