//
// Copyright 2025 DXOS.org
//

export const DEFAULT_LLM_MODEL = '@anthropic/claude-3-5-sonnet-20241022';

// TODO(burdon): Move to service config retrieved by HTTP?
export const DEFAULT_LLM_MODELS = [
  '@anthropic/claude-3-5-haiku-20241022',
  '@anthropic/claude-3-5-sonnet-20241022',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  // '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@hf/nousresearch/hermes-2-pro-mistral-7b',
  '@ollama/llama-3-2-3b',
  '@ollama/llama-3-1-nemotron-70b-instruct',
  '@ollama/llama-3-1-nemotron-mini-4b-instruct',
];
