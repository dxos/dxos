//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, type PluginContext, contributes } from '@dxos/app-framework';
import { WebSearchToolkit, AssistantToolkit, SystemToolkit } from '@dxos/assistant-toolkit';

export default (context: PluginContext): Capability<any>[] => [
  contributes(Capabilities.Toolkit, AssistantToolkit.AssistantToolkit),
  contributes(Capabilities.ToolkitHandler, AssistantToolkit.layer()),

  // TODO(burdon): How to manage dependencies?
  contributes(Capabilities.Toolkit, SystemToolkit.SystemToolkit),
  contributes(Capabilities.ToolkitHandler, SystemToolkit.layer()),

  contributes(Capabilities.Toolkit, WebSearchToolkit),
];
