//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { GenericToolkit } from '@dxos/assistant';
import { AssistantToolkit, SystemToolkit, WebSearchToolkit } from '@dxos/assistant-toolkit';

export default Capability.makeModule(() => [
  Capability.contributes(
    Capabilities.Toolkit,
    GenericToolkit.make(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer()),
  ),

  // TODO(burdon): How to manage dependencies across blueprints.
  Capability.contributes(Capabilities.Toolkit, GenericToolkit.make(SystemToolkit.SystemToolkit, SystemToolkit.layer())),
  Capability.contributes(Capabilities.Toolkit, GenericToolkit.make(WebSearchToolkit, Layer.empty)),
]);
