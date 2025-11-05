//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Capabilities, type Capability, type PluginContext, contributes } from '@dxos/app-framework';
import { GenericToolkit } from '@dxos/assistant';
import { AssistantToolkit, SystemToolkit, WebSearchToolkit } from '@dxos/assistant-toolkit';

export default (context: PluginContext): Capability<any>[] => [
  contributes(Capabilities.Toolkit, GenericToolkit.make(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer())),

  // TODO(burdon): How to manage dependencies?
  contributes(Capabilities.Toolkit, GenericToolkit.make(SystemToolkit.SystemToolkit, SystemToolkit.layer())),

  contributes(Capabilities.Toolkit, GenericToolkit.make(WebSearchToolkit, Layer.empty)),
];
