//
// Copyright 2025 DXOS.org
//

import * as AiError from '@effect/ai/AiError';
import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Prompt from '@effect/ai/Prompt';
import type * as Response from '@effect/ai/Response';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

/**
 * Chat message format (OpenAI-compatible).
 */
type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * OpenAI-compatible chat completion request.
 */
type OpenAiChatRequest = {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  response_format?: { type: 'json_object' };
  temperature?: number;
};

/**
 * Ollama chat completion request.
 */
type OllamaChatRequest = {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
  };
};

/**
 * OpenAI-compatible chat completion response (non-streaming).
 */
type OpenAiChatResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/**
 * Ollama chat completion response (non-streaming).
 */
type OllamaChatResponse = {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
};

/**
 * OpenAI-compatible streaming chunk.
 */
type OpenAiStreamChunk = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
};

/**
 * Ollama streaming chunk.
 */
type OllamaStreamChunk = {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
};

//
// Service
//

/**
 * API format for the chat completions endpoint.
 */
export type ApiFormat = 'ollama' | 'openai';

/**
 * Chat completions client configuration.
 */
export type ChatCompletionsClientConfig = {
  readonly baseUrl: string;
  readonly apiFormat: ApiFormat;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
};

/**
 * Chat completions client service tag.
 *
 * This custom implementation exists because `@effect/ai-openai` has several limitations
 * that prevent it from working with local LLM servers like Ollama and LM Studio:
 *
 * 1. **Hardcoded API key requirement**: The `@effect/ai-openai` package requires an API key
 *    to be configured, even when connecting to local servers that don't need authentication.
 *    It validates the key presence and fails if not provided.
 *
 * 2. **Strict OpenAI API compliance**: Local LLM servers (Ollama, LM Studio, llama.cpp) implement
 *    OpenAI-compatible APIs but with subtle differences in response formats, error handling,
 *    and optional fields. The Effect library expects exact OpenAI response structures.
 *
 * 3. **Different endpoint paths**: Ollama uses `/api/chat` while OpenAI uses `/v1/chat/completions`.
 *    The `@effect/ai-openai` package hardcodes the OpenAI path structure.
 *
 * 4. **Response format variations**: Ollama returns `format: 'json'` while OpenAI uses
 *    `response_format: { type: 'json_object' }`. Token usage fields also differ between providers.
 *
 * 5. **Streaming format differences**: Ollama streams raw JSON lines while OpenAI uses SSE
 *    (Server-Sent Events) with `data:` prefixes. This implementation handles both formats.
 *
 * This implementation provides a unified interface that abstracts over these differences,
 * allowing seamless switching between local and cloud providers via the `apiFormat` config.
 */
export class ChatCompletionsClient extends Context.Tag('@dxos/ai/ChatCompletionsClient')<
  ChatCompletionsClient,
  {
    readonly config: ChatCompletionsClientConfig;
    readonly httpClient: HttpClient.HttpClient;
  }
>() {}

/**
 * Convert Effect AI prompt to chat messages.
 */
const promptToMessages = (prompt: Prompt.Prompt): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  for (const message of prompt.content) {
    if (message.role === 'system') {
      const systemMsg = message as Prompt.SystemMessage;
      messages.push({
        role: 'system',
        content: systemMsg.content,
      });
    } else if (message.role === 'user') {
      const userMsg = message as Prompt.UserMessage;
      // Extract text content from user message parts.
      const textParts = userMsg.content
        .filter((part): part is Prompt.TextPart => 'text' in part && typeof (part as Prompt.TextPart).text === 'string')
        .map((part) => part.text);
      if (textParts.length > 0) {
        messages.push({
          role: 'user',
          content: textParts.join('\n'),
        });
      }
    } else if (message.role === 'assistant') {
      const assistantMsg = message as Prompt.AssistantMessage;
      // Extract text content from assistant message parts.
      const textParts = assistantMsg.content
        .filter((part): part is Prompt.TextPart => 'text' in part && typeof (part as Prompt.TextPart).text === 'string')
        .map((part) => part.text);
      if (textParts.length > 0) {
        messages.push({
          role: 'assistant',
          content: textParts.join('\n'),
        });
      }
    }
  }

  return messages;
};

/**
 * Get the chat endpoint URL based on API format.
 */
const getChatEndpoint = (baseUrl: string, apiFormat: ApiFormat): string => {
  switch (apiFormat) {
    case 'ollama':
      return `${baseUrl}/api/chat`;
    case 'openai':
      return `${baseUrl}/v1/chat/completions`;
  }
};

/**
 * Build the request body based on API format.
 */
const buildRequestBody = (
  model: string,
  messages: ChatMessage[],
  stream: boolean,
  jsonFormat: boolean,
  apiFormat: ApiFormat,
): OllamaChatRequest | OpenAiChatRequest => {
  switch (apiFormat) {
    case 'ollama':
      return {
        model,
        messages,
        stream,
        format: jsonFormat ? 'json' : undefined,
      };
    case 'openai':
      return {
        model,
        messages,
        stream,
        response_format: jsonFormat ? { type: 'json_object' } : undefined,
      };
  }
};

/**
 * Extract text and usage from non-streaming response.
 */
const extractResponse = (
  response: unknown,
  apiFormat: ApiFormat,
): { text: string; inputTokens?: number; outputTokens?: number } => {
  switch (apiFormat) {
    case 'ollama': {
      const r = response as OllamaChatResponse;
      return {
        text: r.message?.content ?? '',
        inputTokens: r.prompt_eval_count,
        outputTokens: r.eval_count,
      };
    }
    case 'openai': {
      const r = response as OpenAiChatResponse;
      return {
        text: r.choices?.[0]?.message?.content ?? '',
        inputTokens: r.usage?.prompt_tokens,
        outputTokens: r.usage?.completion_tokens,
      };
    }
  }
};

/**
 * Parse a streaming chunk based on API format.
 */
const parseStreamChunk = (
  line: string,
  apiFormat: ApiFormat,
): { content?: string; done: boolean; inputTokens?: number; outputTokens?: number } | null => {
  try {
    switch (apiFormat) {
      case 'ollama': {
        const chunk = JSON.parse(line) as OllamaStreamChunk;
        return {
          content: chunk.message?.content,
          done: chunk.done,
          inputTokens: chunk.prompt_eval_count,
          outputTokens: chunk.eval_count,
        };
      }
      case 'openai': {
        // OpenAI SSE format: "data: {...}" or "data: [DONE]".
        const dataPrefix = 'data: ';
        if (!line.startsWith(dataPrefix)) {
          return null;
        }
        const data = line.slice(dataPrefix.length).trim();
        if (data === '[DONE]') {
          return { done: true };
        }
        const chunk = JSON.parse(data) as OpenAiStreamChunk;
        const choice = chunk.choices?.[0];
        return {
          content: choice?.delta?.content,
          done: choice?.finish_reason !== null,
        };
      }
    }
  } catch {
    return null;
  }
};

/**
 * Create a chat completions language model service.
 */
export const make = (model: string) =>
  Effect.flatMap(ChatCompletionsClient, ({ config, httpClient }) =>
    LanguageModel.make({
      generateText: (options) =>
        Effect.gen(function* () {
          const messages = promptToMessages(options.prompt);
          const jsonFormat = options.responseFormat.type === 'json';
          const requestBody = buildRequestBody(model, messages, false, jsonFormat, config.apiFormat);
          const endpoint = getChatEndpoint(config.baseUrl, config.apiFormat);
          const httpRequest = HttpClientRequest.post(endpoint).pipe(HttpClientRequest.bodyJson(requestBody));
          const response = yield* httpRequest.pipe(
            Effect.flatMap((req) => httpClient.execute(req).pipe(Effect.flatMap((res) => res.json))),
            Effect.catchAll((err) => {
              if (HttpClientError.isHttpClientError(err) && (err as any).cause?.code === 'ConnectionRefused') {
                return Effect.fail(
                  new AiError.HttpRequestError({
                    module: 'ChatCompletionsClient',
                    method: 'generateText',
                    request: (err as any).request,
                    reason: 'Transport',
                    description: 'Connection refused',
                    cause: err,
                  }),
                ) as Effect.Effect<never, any, never>;
              }

              return Effect.fail(
                new AiError.UnknownError({
                  module: 'ChatCompletionsClient',
                  method: 'generateText',
                  cause: err,
                }),
              ) as Effect.Effect<never, any, never>;
            }),
          );

          const { text, inputTokens, outputTokens } = extractResponse(response, config.apiFormat);
          const parts: Response.PartEncoded[] = [
            {
              type: 'text',
              text,
            },
            {
              type: 'finish',
              reason: 'stop',
              usage: {
                inputTokens,
                outputTokens,
                totalTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
              },
            },
          ];

          return parts;
        }),

      streamText: (options) =>
        Stream.unwrap(
          Effect.gen(function* () {
            const messages = promptToMessages(options.prompt);
            const jsonFormat = options.responseFormat.type === 'json';
            const requestBody = buildRequestBody(model, messages, true, jsonFormat, config.apiFormat);
            const endpoint = getChatEndpoint(config.baseUrl, config.apiFormat);
            const httpRequest = HttpClientRequest.post(endpoint).pipe(HttpClientRequest.bodyJson(requestBody));
            const response = yield* httpRequest.pipe(
              Effect.flatMap((req) => httpClient.execute(req)),
              Effect.catchAll((err) => {
                if (HttpClientError.isHttpClientError(err) && (err as any).cause?.code === 'ConnectionRefused') {
                  return Effect.fail(
                    new AiError.HttpRequestError({
                      module: 'ChatCompletionsClient',
                      method: 'streamText',
                      request: (err as any).request,
                      reason: 'Transport',
                      description: 'Connection refused',
                      cause: err,
                    }),
                  ) as Effect.Effect<never, any, never>;
                }

                return Effect.fail(
                  new AiError.UnknownError({ module: 'ChatCompletionsClient', method: 'streamText', cause: err }),
                ) as Effect.Effect<never, any, never>;
              }),
            );

            const id = `chat-${Date.now()}`; // TODO(burdon): Better id.
            let started = false;

            return response.stream.pipe(
              Stream.mapConcat((chunk: Uint8Array) => {
                const text = new TextDecoder().decode(chunk);
                const lines = text.split('\n').filter((line) => line.trim().length > 0);
                const parts: Response.StreamPartEncoded[] = [];

                for (const line of lines) {
                  const parsed = parseStreamChunk(line, config.apiFormat);
                  if (!parsed) {
                    continue;
                  }

                  // Emit text-start on first chunk.
                  if (!started) {
                    started = true;
                    parts.push({ type: 'text-start', id });
                  }

                  // Emit text delta if there's content.
                  if (parsed.content && parsed.content.length > 0) {
                    parts.push({ type: 'text-delta', id, delta: parsed.content });
                  }

                  // Handle completion.
                  if (parsed.done) {
                    parts.push({ type: 'text-end', id });
                    parts.push({
                      type: 'finish',
                      reason: 'stop',
                      usage: {
                        inputTokens: parsed.inputTokens,
                        outputTokens: parsed.outputTokens,
                        totalTokens: (parsed.inputTokens ?? 0) + (parsed.outputTokens ?? 0),
                      },
                    });
                  }
                }

                return parts;
              }),
              Stream.catchAll((err) => {
                return Stream.fail(
                  new AiError.UnknownError({ module: 'ChatCompletionsClient', method: 'streamText', cause: err }),
                );
              }),
            );
          }),
        ),
    }),
  );

/**
 * Create a chat completions language model layer.
 */
export const layer = (model: string) => Layer.effect(LanguageModel.LanguageModel, make(model));

/**
 * Create a chat completions client layer.
 */
export const clientLayer = (config: ChatCompletionsClientConfig) =>
  Layer.effect(
    ChatCompletionsClient,
    Effect.gen(function* () {
      const baseClient = yield* HttpClient.HttpClient;
      const httpClient = config.transformClient ? config.transformClient(baseClient) : baseClient;
      return { config, httpClient };
    }),
  );
