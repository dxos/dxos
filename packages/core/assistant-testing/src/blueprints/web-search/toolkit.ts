import { Toolkit } from '@effect/ai';
import { AnthropicTool } from '@effect/ai-anthropic';

export const WebSearchToolkit = Toolkit.make(AnthropicTool.WebSearch_20250305({}));
