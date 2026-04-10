//
// Copyright 2025 DXOS.org
//

import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Layer from 'effect/Layer';

import { GenericToolkit } from '@dxos/ai';

export const WebSearchToolkit = Toolkit.make(AnthropicTool.WebSearch_20250305({}));

export const WebSearchToolkitGeneric = GenericToolkit.make(WebSearchToolkit, Layer.empty);
