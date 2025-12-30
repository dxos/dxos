//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability, Common } from '@dxos/app-framework';
import { GenericToolkit } from '@dxos/assistant';
import { AssistantToolkit, SystemToolkit, WebSearchToolkit } from '@dxos/assistant-toolkit';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(
      Common.Capability.Toolkit,
      GenericToolkit.make(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer()),
    ),

    // TODO(burdon): How to manage dependencies across blueprints.
    Capability.contributes(
      Common.Capability.Toolkit,
      GenericToolkit.make(SystemToolkit.SystemToolkit, SystemToolkit.layer()),
    ),
    Capability.contributes(Common.Capability.Toolkit, GenericToolkit.make(WebSearchToolkit, Layer.empty)),
  ]),
);
