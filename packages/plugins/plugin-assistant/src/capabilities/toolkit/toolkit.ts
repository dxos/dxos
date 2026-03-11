//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { GenericToolkit } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { WebSearchToolkit } from '@dxos/assistant-toolkit';

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(AppCapabilities.Toolkit, GenericToolkit.make(WebSearchToolkit, Layer.empty))]),
);
