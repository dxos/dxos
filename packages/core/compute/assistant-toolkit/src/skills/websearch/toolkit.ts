//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { OpaqueToolkit } from '@dxos/ai';
import { AnthropicWebSearchTool } from '@dxos/ai/resolvers';

export const WebSearchToolkit = Toolkit.make(AnthropicWebSearchTool);

export const WebSearchToolkitOpaque = OpaqueToolkit.make(WebSearchToolkit, Layer.empty);
