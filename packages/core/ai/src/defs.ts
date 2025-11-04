//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Share with Edge.

export const DEFAULT_EDGE_MODELS = [
  // AI Gateway.
  // https://developers.cloudflare.com/ai-gateway
  '@anthropic/claude-3-5-haiku-latest',
  '@anthropic/claude-3-5-haiku-20241022',
  // Deprecated?
  '@anthropic/claude-3-5-sonnet-20241022',
  '@anthropic/claude-3-7-sonnet-20250219',
  '@anthropic/claude-sonnet-4-0',
  '@anthropic/claude-sonnet-4-20250514',
  '@anthropic/claude-opus-4-0',
  '@anthropic/claude-opus-4-20250514',

  // Workers AI.
  // https://developers.cloudflare.com/workers-ai/models
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@hf/nousresearch/hermes-2-pro-mistral-7b',
  '@ollama/llama-3-1-nemotron-70b-instruct',
  '@ollama/llama-3-1-nemotron-mini-4b-instruct',
  '@ollama/llama-3-2-3b',
] as const;

export const DEFAULT_EDGE_MODEL = '@anthropic/claude-3-5-haiku-latest';

// TODO(burdon): Config.
export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

/**
 * https://ollama.com/library
 */
export const DEFAULT_OLLAMA_MODELS = [
  //
  'qwen2.5:14b', // Test function calling?
  'llama3.2:1b',
  'llama3:70b',
  'deepseek-r1:latest',
] as const;

export const DEFAULT_OLLAMA_MODEL = 'llama3.2:1b';

/**
 * https://lmstudio.ai/models
 */
export const DEFAULT_LMSTUDIO_MODELS = [
  //
  '@google/gemma-3-27b',
  '@mlx-community/llama-3.2-3b-instruct',
] as const;

export const DEFAULT_LMSTUDIO_MODEL = '@google/gemma-3-27b';

export const DEFAULT_OPENAI_MODELS = [
  '@openai/gpt-4o',
  '@openai/gpt-4o-mini',
  '@openai/o1',
  '@openai/o3',
  '@openai/o3-mini',
] as const;
