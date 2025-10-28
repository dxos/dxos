//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, type PluginContext, contributes } from '@dxos/app-framework';
import { WebSearchToolkit } from '@dxos/assistant-toolkit';

import { AssistantToolkit, SystemToolkit } from '../toolkits';

export default (context: PluginContext): Capability<any>[] => [
  contributes(Capabilities.Toolkit, AssistantToolkit),
  contributes(Capabilities.ToolkitHandler, AssistantToolkit.layer(context)),

  // TODO(burdon): How to manage dependencies?
  contributes(Capabilities.Toolkit, SystemToolkit),
  contributes(Capabilities.ToolkitHandler, SystemToolkit.layer(context)),

  contributes(Capabilities.Toolkit, WebSearchToolkit),
];
