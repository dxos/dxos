//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';

export const WebSearchToolkit = Toolkit.make(AnthropicTool.WebSearch_20250305({}));
