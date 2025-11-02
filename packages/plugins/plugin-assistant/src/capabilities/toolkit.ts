//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, type PluginContext, contributes } from '@dxos/app-framework';
import { WebSearchToolkit } from '@dxos/assistant-toolkit';

import { AssistantToolkit, SystemToolkit } from '../toolkits';

export default (context: PluginContext): Capability<any>[] => [
  contributes(Capabilities.Toolkit, AssistantToolkit.Toolkit),
  contributes(Capabilities.ToolkitHandler, AssistantToolkit.createLayer(context)),

  // TODO(burdon): How to manage dependencies?
  contributes(Capabilities.Toolkit, SystemToolkit.Toolkit),
  contributes(Capabilities.ToolkitHandler, SystemToolkit.createLayer(context)),

  contributes(Capabilities.Toolkit, WebSearchToolkit),
];
