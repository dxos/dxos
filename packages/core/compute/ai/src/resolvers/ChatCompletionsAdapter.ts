//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';
import * as AiError from 'effect/unstable/ai/AiError';
import * as IdGenerator from 'effect/unstable/ai/IdGenerator';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import type * as Prompt from 'effect/unstable/ai/Prompt';
import type * as Response from 'effect/unstable/ai/Response';
import * as Telemetry from 'effect/unstable/ai/Telemetry';
import * as Tool from 'effect/unstable/ai/Tool';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { log } from '@dxos/log';

/**
 * Effect 4 reshaped the AI errors the way it reshaped `HttpClientError`: one `AiError` wrapper
 * carrying the module and method, with a semantic `reason` as the payload. `HttpRequestError`
 * became `NetworkError` (and friends); the reasons have no `cause`, so a cause is rendered into
 * the reason's `description`.
 */
const MODULE = 'ChatCompletionsClient';

const describe = (detail: string, cause?: unknown): string =>
  cause === undefined ? detail : `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`;

/** The request record v4's `NetworkError` carries, projected from an `HttpClientRequest` when there is one. */
const toErrorRequest = (request?: HttpClientRequest.HttpClientRequest): AiError.NetworkError['request'] => ({
  method: (request?.method ?? 'POST') as AiError.NetworkError['request']['method'],
  url: request?.url ?? '',
  urlParams: [],
  hash: undefined,
  headers: {},
});

const isConnectionRefused = (cause: unknown): boolean =>
  Predicate.hasProperty(cause, 'code') && cause.code === 'ConnectionRefused';

const networkError = (method: string, detail: string, options?: { request?: unknown; cause?: unknown }) =>
  new AiError.AiError({
    module: MODULE,
    method,
    reason: new AiError.NetworkError({
      reason: 'TransportError',
      request: toErrorRequest(HttpClientRequest.isHttpClientRequest(options?.request) ? options.request : undefined),
      description: describe(detail, options?.cause),
    }),
  });

const unknownError = (method: string, detail: string, cause?: unknown) =>
  new AiError.AiError({
    module: MODULE,
    method,
    reason: new AiError.UnknownError({ description: describe(detail, cause) }),
  });

/**
 * OpenAI-style tool call (both Ollama and OpenAI endpoints emit a variant of this).
 *
 * - OpenAI: `arguments` is a JSON-encoded string.
 * - Ollama: `arguments` is an already-parsed object.
 */
type ChatToolCall = {
  id?: string;
  type?: 'function';
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
};

/**
 * Chat message format (OpenAI/Ollama compatible).
 *
 * Tool-call assistant messages and tool-result messages are represented using the
 * OpenAI function-calling convention, which Ollama's `/api/chat` also accepts.
 */
type ChatMessage =
  | {
      role: 'system' | 'user';
      content: string;
    }
  | {
      role: 'assistant';
      content: string;
      /** Sent back to a provider that asks for it; see {@link replaysReasoning}. */
      reasoning_content?: string;
      tool_calls?: ChatToolCall[];
    }
  | {
      role: 'tool';
      content: string;
      tool_call_id?: string;
      name?: string;
    };

/**
 * Tool definition as sent to the provider.
 */
type ChatTool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: unknown;
  };
};

/**
 * OpenAI-compatible chat completion request.
 */
type OpenAiChatRequest = {
  model: string;
  /** Provider-specific fields passed through from {@link RequestOptions.body} (e.g. DeepSeek `thinking`). */
  [key: string]: unknown;
  messages: ChatMessage[];
  stream?: boolean;
  stream_options?: { include_usage: boolean };
  response_format?: { type: 'json_object' };
  temperature?: number;
  tools?: ChatTool[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
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
  tools?: ChatTool[];
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
      content: string | null;
      /** DeepSeek (and other reasoning models) return chain-of-thought alongside the answer. */
      reasoning_content?: string | null;
      tool_calls?: ChatToolCall[];
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
    thinking?: string;
    tool_calls?: ChatToolCall[];
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
      content?: string | null;
      reasoning_content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  /** Present only on the final chunk, and only when `stream_options.include_usage` was requested. */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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
    thinking?: string;
    tool_calls?: ChatToolCall[];
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
  /**
   * The serving product, reported as `gen_ai.system`. Distinct from {@link ApiFormat}, which is the
   * wire dialect: LM Studio and any other OpenAI-compatible endpoint speak `'openai'` without being
   * OpenAI, and consumers price on this field. Defaults to the API format.
   */
  readonly provider?: string;
  /**
   * Request `stream_options.include_usage` on streamed OpenAI-format calls. Providers that meter on
   * reported usage (DeepSeek via EDGE) need it; local servers that reject unknown fields do not.
   */
  readonly streamUsage?: boolean;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
  /**
   * Maximum duration to wait for the HTTP response to start. Applies to both
   * `generateText` and the initial connection in `streamText`. Defaults to 2 minutes.
   */
  readonly requestTimeout?: Duration.Duration;
  /**
   * Maximum duration allowed between streamed SSE chunks before the stream is
   * aborted with a timeout error. Defaults to 60 seconds.
   */
  readonly streamIdleTimeout?: Duration.Duration;
};

const DEFAULT_REQUEST_TIMEOUT: Duration.Duration = Duration.minutes(2);
const DEFAULT_STREAM_IDLE_TIMEOUT: Duration.Duration = Duration.seconds(60);

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
export class ChatCompletionsClient extends Context.Service<
  ChatCompletionsClient,
  {
    readonly config: ChatCompletionsClientConfig;
    readonly httpClient: HttpClient.HttpClient;
  }
>()('@dxos/ai/ChatCompletionsClient') {}

/**
 * Convert Effect AI prompt to chat messages.
 *
 * Text parts become plain string content. Assistant tool-call parts and tool
 * result messages are mapped to the OpenAI function-calling convention which
 * Ollama also accepts.
 */
/**
 * Whether a provider wants an assistant turn's reasoning sent back with it. DeepSeek's thinking mode
 * refuses a request whose earlier tool-calling turns come back without their `reasoning_content`,
 * an empty one included, so a tool-calling turn always carries the field; OpenAI-format servers that
 * never produced any would be sent a field they do not know.
 */
const replaysReasoning = (config: ChatCompletionsClientConfig): boolean => config.provider === 'deepseek';

/** The messages of a request by role and what each carries, without their content. */
const describeMessages = (messages: ChatMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content.length : undefined,
    ...('reasoning_content' in message ? { reasoning: message.reasoning_content?.length } : {}),
    ...('tool_calls' in message ? { toolCalls: message.tool_calls?.length } : {}),
    ...('tool_call_id' in message ? { toolCallId: message.tool_call_id } : {}),
  }));

const promptToMessages = (prompt: Prompt.Prompt, apiFormat: ApiFormat, replayReasoning = false): ChatMessage[] => {
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
      const textParts: string[] = [];
      const reasoningParts: string[] = [];
      const toolCalls: ChatToolCall[] = [];
      for (const part of assistantMsg.content) {
        if (part.type === 'text') {
          textParts.push(part.text);
        } else if (part.type === 'reasoning') {
          reasoningParts.push(part.text);
        } else if (part.type === 'tool-call') {
          toolCalls.push({
            id: part.id,
            type: 'function',
            function: {
              name: part.name,
              arguments: encodeToolParams(part, apiFormat),
            },
          });
        }
      }
      const text = textParts.join('\n');
      const reasoning = reasoningParts.join('\n');
      if (toolCalls.length > 0 || text.length > 0) {
        messages.push({
          role: 'assistant',
          content: text,
          ...(replayReasoning && (reasoning.length > 0 || toolCalls.length > 0) ? { reasoning_content: reasoning } : {}),
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
      }
    } else if (message.role === 'tool') {
      const toolMsg = message as Prompt.ToolMessage;
      for (const part of toolMsg.content) {
        if (part.type !== 'tool-result') {
          continue;
        }
        messages.push({
          role: 'tool',
          content: encodeToolResult(part),
          tool_call_id: part.id,
          name: part.name,
        });
      }
    }
  }

  return messages;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Ollama decodes `tool_calls[].function.arguments` into a map and rejects a string with 400, while
 * OpenAI specifies that string — so the encoding follows the format rather than the value.
 */
const encodeToolParams = (part: Prompt.ToolCallPart, apiFormat: ApiFormat): string | Record<string, unknown> => {
  if (apiFormat === 'ollama') {
    if (isRecord(part.params)) {
      return part.params;
    }
    // An empty map, since a string that does not parse to an object has no map form.
    try {
      const parsed = typeof part.params === 'string' ? Tool.unsafeSecureJsonParse(part.params) : undefined;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof part.params === 'string') {
    return part.params;
  }
  try {
    return JSON.stringify(part.params);
  } catch {
    return String(part.params);
  }
};

const encodeToolResult = (part: Prompt.ToolResultPart): string => {
  if (typeof part.result === 'string') {
    return part.result;
  }
  try {
    return JSON.stringify(part.result);
  } catch {}
  return String(part.result);
};

/**
 * Convert Effect AI tools to the provider-defined function-calling tool format.
 * Both OpenAI (`/v1/chat/completions`) and Ollama (`/api/chat`) accept this shape.
 */
const toolsToRequest = (tools: ReadonlyArray<Tool.Any>): ChatTool[] | undefined => {
  if (tools.length === 0) {
    return undefined;
  }
  const out: ChatTool[] = [];
  for (const tool of tools) {
    // Operations project to dynamic tools, which carry their own JSON Schema; skipping them here would
    // silently drop every operation-backed tool from the request.
    if (!Tool.isUserDefined(tool) && !Tool.isDynamic(tool)) {
      continue;
    }
    out.push({
      type: 'function',
      function: {
        name: tool.name,
        description: Tool.getDescription(tool as any),
        parameters: Tool.getJsonSchema(tool as any),
      },
    });
  }
  return out.length > 0 ? out : undefined;
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
  tools: ChatTool[] | undefined,
  streamUsage = false,
  extraBody: Readonly<Record<string, unknown>> = {},
): OllamaChatRequest | OpenAiChatRequest => {
  switch (apiFormat) {
    case 'ollama':
      return {
        model,
        messages,
        stream,
        format: jsonFormat ? 'json' : undefined,
        tools,
      };
    case 'openai':
      return {
        ...extraBody,
        model,
        messages,
        stream,
        stream_options: stream && streamUsage ? { include_usage: true } : undefined,
        response_format: jsonFormat ? { type: 'json_object' } : undefined,
        tools,
        tool_choice: tools ? 'auto' : undefined,
      };
  }
};

type NormalizedToolCall = {
  id?: string;
  name: string;
  /** Raw arguments, either a JSON string (OpenAI) or a parsed object (Ollama). */
  arguments: string | Record<string, unknown>;
};

const normalizeToolCalls = (calls: ChatToolCall[] | undefined): NormalizedToolCall[] =>
  (calls ?? []).map((c) => ({
    id: c.id,
    name: c.function.name,
    arguments: c.function.arguments ?? {},
  }));

const parseToolArguments = (
  args: string | Record<string, unknown>,
  toolName: string,
  method: string,
): Effect.Effect<unknown, AiError.AiError> => {
  if (typeof args !== 'string') {
    return Effect.succeed(args);
  }
  if (args.length === 0) {
    return Effect.succeed({});
  }
  return Effect.try({
    try: () => Tool.unsafeSecureJsonParse(args),
    catch: (cause) =>
      new AiError.AiError({
        module: MODULE,
        method,
        reason: new AiError.InvalidOutputError({
          description: describe(`failed to parse tool call parameters for tool '${toolName}': ${args}`, cause),
        }),
      }),
  });
};

/**
 * Extract text, reasoning, tool calls and usage from a non-streaming response.
 */
const extractResponse = (
  response: unknown,
  apiFormat: ApiFormat,
): {
  text: string;
  reasoning?: string;
  toolCalls: NormalizedToolCall[];
  inputTokens?: number;
  outputTokens?: number;
  finishReason: Response.FinishReason;
} => {
  switch (apiFormat) {
    case 'ollama': {
      const r = response as OllamaChatResponse;
      const toolCalls = normalizeToolCalls(r.message?.tool_calls);
      return {
        text: r.message?.content ?? '',
        reasoning: r.message?.thinking,
        toolCalls,
        inputTokens: r.prompt_eval_count,
        outputTokens: r.eval_count,
        finishReason: toolCalls.length > 0 ? 'tool-calls' : 'stop',
      };
    }
    case 'openai': {
      const r = response as OpenAiChatResponse;
      const choice = r.choices?.[0];
      const toolCalls = normalizeToolCalls(choice?.message?.tool_calls);
      const mappedReason = mapOpenAiFinishReason(choice?.finish_reason);
      return {
        text: choice?.message?.content ?? '',
        reasoning: choice?.message?.reasoning_content ?? undefined,
        toolCalls,
        inputTokens: r.usage?.prompt_tokens,
        outputTokens: r.usage?.completion_tokens,
        finishReason: toolCalls.length > 0 ? 'tool-calls' : mappedReason,
      };
    }
  }
};

const mapOpenAiFinishReason = (reason: string | null | undefined): Response.FinishReason => {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
    case 'function_call':
      return 'tool-calls';
    case 'content_filter':
      return 'content-filter';
    default:
      return 'stop';
  }
};

type ParsedStreamChunk = {
  content?: string;
  reasoning?: string;
  done: boolean;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: Response.FinishReason;
  /** Fully-assembled tool calls present in this chunk (Ollama). */
  toolCalls?: NormalizedToolCall[];
  /** Partial OpenAI-style deltas that must be accumulated across chunks. */
  toolCallDeltas?: Array<{
    index: number;
    id?: string;
    name?: string;
    argsDelta?: string;
  }>;
} | null;

/**
 * Parse a streaming chunk based on API format.
 */
const parseStreamChunk = (line: string, apiFormat: ApiFormat): ParsedStreamChunk => {
  try {
    switch (apiFormat) {
      case 'ollama': {
        const chunk = JSON.parse(line) as OllamaStreamChunk;
        return {
          content: chunk.message?.content,
          reasoning: chunk.message?.thinking,
          done: chunk.done,
          inputTokens: chunk.prompt_eval_count,
          outputTokens: chunk.eval_count,
          toolCalls: chunk.message?.tool_calls ? normalizeToolCalls(chunk.message.tool_calls) : undefined,
          finishReason: chunk.done
            ? chunk.message?.tool_calls && chunk.message.tool_calls.length > 0
              ? 'tool-calls'
              : 'stop'
            : undefined,
        };
      }
      case 'openai': {
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
        // The chunk is an unvalidated cast over `JSON.parse`; a non-numeric count would otherwise
        // reach the finish payload and telemetry as a string.
        const tokenCount = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
        const deltas = choice?.delta?.tool_calls?.map((tc) => ({
          index: tc.index,
          id: tc.id,
          name: tc.function?.name,
          argsDelta: tc.function?.arguments,
        }));
        return {
          content: choice?.delta?.content ?? undefined,
          reasoning: choice?.delta?.reasoning_content ?? undefined,
          done: choice?.finish_reason !== null && choice?.finish_reason !== undefined,
          inputTokens: tokenCount(chunk.usage?.prompt_tokens),
          outputTokens: tokenCount(chunk.usage?.completion_tokens),
          finishReason: choice?.finish_reason ? mapOpenAiFinishReason(choice.finish_reason) : undefined,
          toolCallDeltas: deltas,
        };
      }
    }
  } catch {
    return null;
  }
};

/**
 * Per-model request options.
 */
export type RequestOptions = {
  /**
   * Provider-specific request-body fields merged into every OpenAI-format call (DeepSeek's
   * `thinking` and `reasoning_effort`, say). Ignored for the Ollama dialect.
   */
  readonly body?: Readonly<Record<string, unknown>>;
};

/**
 * Create a chat completions language model service.
 */
export const make = (model: string, requestOptions: RequestOptions = {}) =>
  Effect.flatMap(ChatCompletionsClient, ({ config, httpClient }) => {
    const requestTimeout = config.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT;
    const streamIdleTimeout = config.streamIdleTimeout ?? DEFAULT_STREAM_IDLE_TIMEOUT;

    return LanguageModel.make({
      generateText: (options) =>
        Effect.gen(function* () {
          const idGen = yield* IdGenerator.IdGenerator;
          annotateRequest(options.span, model, config);

          const messages = promptToMessages(options.prompt, config.apiFormat, replaysReasoning(config));
          const jsonFormat = options.responseFormat.type === 'json';
          const tools = toolsToRequest(options.tools);
          const requestBody = buildRequestBody(
            model,
            messages,
            false,
            jsonFormat,
            config.apiFormat,
            tools,
            false,
            requestOptions.body,
          );
          const endpoint = getChatEndpoint(config.baseUrl, config.apiFormat);
          const httpRequest = HttpClientRequest.post(endpoint).pipe(HttpClientRequest.bodyJson(requestBody));
          const response = yield* httpRequest.pipe(
            Effect.flatMap((req) => httpClient.execute(req).pipe(Effect.flatMap((res) => res.json))),
            Effect.timeoutOrElse({
              duration: requestTimeout,
              orElse: () => networkError('generateText', `request timed out after ${Duration.format(requestTimeout)}`),
            }),
            Effect.catch((err) => {
              if (err instanceof AiError.AiError) {
                return Effect.fail(err) as Effect.Effect<never, any, never>;
              }
              if (HttpClientError.isHttpClientError(err) && isConnectionRefused(err.cause)) {
                return Effect.fail(
                  networkError('generateText', 'connection refused', { request: err.request, cause: err }),
                ) as Effect.Effect<never, any, never>;
              }

              return Effect.fail(unknownError('generateText', 'request failed', err)) as Effect.Effect<
                never,
                any,
                never
              >;
            }),
          );

          const { text, reasoning, toolCalls, inputTokens, outputTokens, finishReason } = extractResponse(
            response,
            config.apiFormat,
          );
          annotateResponse(options.span, { inputTokens, outputTokens, finishReason });

          const parts: Response.PartEncoded[] = [];
          if (reasoning && reasoning.length > 0) {
            parts.push({ type: 'reasoning', text: reasoning });
          }
          if (text.length > 0) {
            parts.push({ type: 'text', text });
          }
          for (const call of toolCalls) {
            const params = yield* parseToolArguments(call.arguments, call.name, 'generateText');
            const id = call.id ?? (yield* idGen.generateId());
            parts.push({
              type: 'tool-call',
              id,
              name: call.name,
              params,
              providerExecuted: false,
            });
          }
          parts.push({
            type: 'finish',
            reason: finishReason,
            usage: {
              inputTokens: { total: inputTokens },
              outputTokens: { total: outputTokens },
            },
          });

          return parts;
        }),

      streamText: (options) =>
        Stream.unwrap(
          Effect.gen(function* () {
            const idGen = yield* IdGenerator.IdGenerator;
            annotateRequest(options.span, model, config);

            const messages = promptToMessages(options.prompt, config.apiFormat, replaysReasoning(config));
            const jsonFormat = options.responseFormat.type === 'json';
            const tools = toolsToRequest(options.tools);
            const requestBody = buildRequestBody(
              model,
              messages,
              true,
              jsonFormat,
              config.apiFormat,
              tools,
              config.streamUsage,
              requestOptions.body,
            );
            const endpoint = getChatEndpoint(config.baseUrl, config.apiFormat);
            const httpRequest = HttpClientRequest.post(endpoint).pipe(HttpClientRequest.bodyJson(requestBody));
            const response = yield* httpRequest.pipe(
              Effect.flatMap((req) => httpClient.execute(req)),
              Effect.timeoutOrElse({
                duration: requestTimeout,
                orElse: () => networkError('streamText', `request timed out after ${Duration.format(requestTimeout)}`),
              }),
              Effect.catch((err) => {
                if (err instanceof AiError.AiError) {
                  return Effect.fail(err) as Effect.Effect<never, any, never>;
                }
                if (HttpClientError.isHttpClientError(err) && isConnectionRefused(err.cause)) {
                  return Effect.fail(
                    networkError('streamText', 'connection refused', { request: err.request, cause: err }),
                  ) as Effect.Effect<never, any, never>;
                }

                return Effect.fail(unknownError('streamText', 'request failed', err)) as Effect.Effect<
                  never,
                  any,
                  never
                >;
              }),
            );
            if (response.status !== 200) {
              const body = yield* response.text;
              // A rejection is about the request, so the shape of what was sent goes next to it: a
              // provider that wants a field on a turn names the turn, not the field it saw.
              log.warn('chat completions request rejected', {
                status: response.status,
                body: body.slice(0, 500),
                messages: describeMessages(messages),
              });
              try {
                const json = JSON.parse(body);
                const error = json.error;
                if (typeof error === 'string') {
                  return Stream.fail(unknownError('streamText', error));
                }
              } catch {}
              return Stream.fail(unknownError('streamText', body));
            }

            const textId = `chat-text-${Date.now()}`;
            const reasoningId = `chat-reasoning-${Date.now()}`;
            let textStarted = false;
            let textEnded = false;
            let reasoningStarted = false;
            let reasoningEnded = false;

            // The finish part is emitted once, after the source completes, rather than on the first
            // chunk reporting `done`. Two shapes force this: OpenAI-format streams end with a
            // `data: [DONE]` sentinel *after* the `finish_reason` chunk, so emitting per `done` sent
            // a second, usage-less finish; and a provider may report usage in a trailing chunk whose
            // `choices` is empty (OpenAI proper does), which arrives after `finish_reason`.
            let finishSeen = false;
            let finishReason: Response.FinishReason | undefined;
            let inputTokens: number | undefined;
            let outputTokens: number | undefined;

            /**
             * Ensure reasoning is closed before emitting non-reasoning parts.
             */
            const closeReasoningIfOpen = (parts: Response.StreamPartEncoded[]) => {
              if (reasoningStarted && !reasoningEnded) {
                reasoningEnded = true;
                parts.push({ type: 'reasoning-end', id: reasoningId });
              }
            };

            // Accumulator for OpenAI-style tool call deltas keyed by index.
            type OpenAiCallState = {
              id?: string;
              name?: string;
              args: string;
              emittedId?: string;
              started: boolean;
              flushed: boolean;
            };
            const openAiCalls = new Map<number, OpenAiCallState>();

            /**
             * Emits the terminating `tool-params-end` / `tool-call` pair for every started call whose
             * index is below `before`. Consumers track a single open tool call, so a parallel call's
             * `tool-params-start` must not arrive while the previous one is still open.
             */
            const flushOpenAiCalls = (parts: Response.StreamPartEncoded[], before: number) =>
              Effect.gen(function* () {
                for (const [index, call] of openAiCalls) {
                  if (index >= before || call.flushed || !call.started || !call.name || !call.emittedId) {
                    continue;
                  }
                  call.flushed = true;
                  parts.push({ type: 'tool-params-end', id: call.emittedId });
                  const params = yield* parseToolArguments(call.args, call.name, 'streamText');
                  parts.push({
                    type: 'tool-call',
                    id: call.emittedId,
                    name: call.name,
                    params,
                    providerExecuted: false,
                  });
                }
              });

            // Buffer lines across chunk boundaries — newline-delimited frames and UTF-8
            // characters can be split across network chunks.
            const decoder = new TextDecoder();
            let pendingLine = '';

            const parsedStream: Stream.Stream<Response.StreamPartEncoded, any, any> = response.stream.pipe(
              withIdleTimeout(streamIdleTimeout, () =>
                networkError('streamText', `stream idle for more than ${Duration.format(streamIdleTimeout)}`),
              ),
              Stream.mapEffect((chunk: Uint8Array) =>
                Effect.gen(function* () {
                  const text = pendingLine + decoder.decode(chunk, { stream: true });
                  const frames = text.split('\n');
                  pendingLine = frames.pop() ?? '';
                  const lines = frames.filter((line) => line.trim().length > 0);
                  const parts: Response.StreamPartEncoded[] = [];

                  for (const line of lines) {
                    const parsed = parseStreamChunk(line, config.apiFormat);
                    if (!parsed) {
                      continue;
                    }

                    // Last reported value wins: a trailing usage-only chunk supersedes the counts on
                    // the chunk that carried `finish_reason`.
                    inputTokens = parsed.inputTokens ?? inputTokens;
                    outputTokens = parsed.outputTokens ?? outputTokens;

                    if (parsed.reasoning && parsed.reasoning.length > 0) {
                      if (!reasoningStarted) {
                        reasoningStarted = true;
                        parts.push({ type: 'reasoning-start', id: reasoningId });
                      }
                      parts.push({ type: 'reasoning-delta', id: reasoningId, delta: parsed.reasoning });
                    }

                    if (parsed.content && parsed.content.length > 0) {
                      closeReasoningIfOpen(parts);
                      if (!textStarted) {
                        textStarted = true;
                        parts.push({ type: 'text-start', id: textId });
                      }
                      parts.push({ type: 'text-delta', id: textId, delta: parsed.content });
                    }

                    // Fully-assembled tool calls (Ollama).
                    if (parsed.toolCalls && parsed.toolCalls.length > 0) {
                      closeReasoningIfOpen(parts);
                      if (textStarted && !textEnded) {
                        textEnded = true;
                        parts.push({ type: 'text-end', id: textId });
                      }
                      for (const call of parsed.toolCalls) {
                        const id = call.id ?? (yield* idGen.generateId());
                        const argsJson =
                          typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments);
                        parts.push({ type: 'tool-params-start', id, name: call.name, providerExecuted: false });
                        if (argsJson.length > 0) {
                          parts.push({ type: 'tool-params-delta', id, delta: argsJson });
                        }
                        parts.push({ type: 'tool-params-end', id });
                        const params = yield* parseToolArguments(call.arguments, call.name, 'streamText');
                        parts.push({
                          type: 'tool-call',
                          id,
                          name: call.name,
                          params,
                          providerExecuted: false,
                        });
                      }
                    }

                    // Incremental tool call deltas (OpenAI).
                    if (parsed.toolCallDeltas && parsed.toolCallDeltas.length > 0) {
                      closeReasoningIfOpen(parts);
                      for (const delta of parsed.toolCallDeltas) {
                        const existing: OpenAiCallState = openAiCalls.get(delta.index) ?? {
                          args: '',
                          started: false,
                          flushed: false,
                        };
                        if (delta.id) {
                          existing.id = delta.id;
                        }
                        if (delta.name) {
                          existing.name = delta.name;
                        }
                        if (!existing.started && existing.name) {
                          // Calls stream one index at a time, so a new index means every earlier call
                          // is complete.
                          yield* flushOpenAiCalls(parts, delta.index);
                          existing.started = true;
                          existing.emittedId = existing.id ?? (yield* idGen.generateId());
                          parts.push({
                            type: 'tool-params-start',
                            id: existing.emittedId,
                            name: existing.name,
                            providerExecuted: false,
                          });
                        }
                        if (delta.argsDelta && delta.argsDelta.length > 0) {
                          existing.args += delta.argsDelta;
                          if (existing.started && existing.emittedId) {
                            parts.push({
                              type: 'tool-params-delta',
                              id: existing.emittedId,
                              delta: delta.argsDelta,
                            });
                          }
                        }
                        openAiCalls.set(delta.index, existing);
                      }
                    }

                    if (parsed.done) {
                      if (textStarted && !textEnded) {
                        textEnded = true;
                        parts.push({ type: 'text-end', id: textId });
                      }
                      closeReasoningIfOpen(parts);

                      // Flush whichever OpenAI tool call is still open.
                      yield* flushOpenAiCalls(parts, Number.POSITIVE_INFINITY);
                      openAiCalls.clear();

                      finishSeen = true;
                      finishReason = parsed.finishReason ?? finishReason;
                    }
                  }

                  return parts;
                }),
              ),
              Stream.flattenIterable,
              Stream.catch((err): Stream.Stream<never, AiError.AiError, never> => {
                if (err instanceof AiError.AiError) {
                  return Stream.fail(err);
                }
                return Stream.fail(unknownError('streamText', 'request failed', err));
              }),
              // Suspended so the accumulators are read after the source drains. A stream that ended
              // without reporting `done` (truncated, or failed above) emits nothing, as before.
              (stream) =>
                Stream.concat(
                  stream,
                  Stream.suspend((): Stream.Stream<Response.StreamPartEncoded, never, never> => {
                    if (!finishSeen) {
                      return Stream.empty;
                    }
                    const reason = finishReason ?? 'stop';
                    annotateResponse(options.span, { inputTokens, outputTokens, finishReason: reason });
                    return Stream.succeed({
                      type: 'finish',
                      reason,
                      usage: {
                        inputTokens: { total: inputTokens },
                        outputTokens: { total: outputTokens },
                      },
                    });
                  }),
                ),
            );

            return parsedStream;
          }),
        ),
    });
  });

const annotateRequest = (
  span: LanguageModel.ProviderOptions['span'],
  model: string,
  config: ChatCompletionsClientConfig,
): void =>
  Telemetry.addGenAIAnnotations(span, {
    system: config.provider ?? config.apiFormat,
    operation: { name: 'chat' },
    request: { model },
  });

const annotateResponse = (
  span: LanguageModel.ProviderOptions['span'],
  { inputTokens, outputTokens, finishReason }: { inputTokens?: number; outputTokens?: number; finishReason?: string },
): void =>
  Telemetry.addGenAIAnnotations(span, {
    response: { finishReasons: finishReason ? [finishReason] : undefined },
    usage: { inputTokens, outputTokens },
  });

/**
 * Apply a per-chunk idle timeout to a stream. Fails with `onTimeout(...)` if no chunk is
 * emitted within `timeout` of the previous one (or of stream start for the first chunk).
 */
const withIdleTimeout =
  <E2>(timeout: Duration.Duration, onTimeout: () => E2) =>
  <A, E, R>(stream: Stream.Stream<A, E, R>): Stream.Stream<A, E | E2, R> =>
    // v4 replaced the `Option`-encoded pull protocol: a pull ends by failing with `Cause.Done`,
    // which `fromPull` excludes from the resulting error type, so the timeout is a plain failure.
    Stream.fromPull(
      Effect.map(Stream.toPull(stream), (pull) =>
        pull.pipe(Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.fail(onTimeout()) })),
      ),
    ) as Stream.Stream<A, E | E2, R>;

/**
 * Create a chat completions language model layer.
 */
export const layer = (model: string, options?: RequestOptions) =>
  Layer.effect(LanguageModel.LanguageModel, make(model, options));

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
