//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { GenericToolkit } from '@dxos/assistant';
import { AssistantToolkit, SystemToolkit, WebSearchToolkit } from '@dxos/assistant-toolkit';

export default defineCapabilityModule(() => [
  contributes(Capabilities.Toolkit, GenericToolkit.make(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer())),

  // TODO(burdon): How to manage dependencies across blueprints.
  contributes(Capabilities.Toolkit, GenericToolkit.make(SystemToolkit.SystemToolkit, SystemToolkit.layer())),
  contributes(Capabilities.Toolkit, GenericToolkit.make(WebSearchToolkit, Layer.empty)),
]);
