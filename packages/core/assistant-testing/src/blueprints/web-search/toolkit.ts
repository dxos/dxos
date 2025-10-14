//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import { AnthropicTool } from '@effect/ai-anthropic';

export const WebSearchToolkit = Toolkit.make(AnthropicTool.WebSearch_20250305({}));
