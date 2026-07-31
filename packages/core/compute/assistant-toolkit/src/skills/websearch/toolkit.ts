//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Layer from 'effect/Layer';

import { AnthropicWebSearchTool, OpaqueToolkit } from '@dxos/ai';

export const WebSearchToolkit = Toolkit.make(AnthropicWebSearchTool);

export const WebSearchToolkitOpaque = OpaqueToolkit.make(WebSearchToolkit, Layer.empty);
