//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { SDKMessage, SDKPermissionDenial, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

import { log } from '@dxos/log';
import { ContentBlock, Message } from '@dxos/types';

/**
 * Name recorded for a tool result whose `tool_use` was never seen — possible when a projector is
 * attached mid-stream (e.g. a resumed session), since correlation is stream-order only.
 */
export const UNKNOWN_TOOL_NAME = 'unknown';

/** Properties carried through from the SDK frame; see {@link Projector.message}. */
export type SdkProperties = {
  /** SDK frame id, stable across a session. */
  sdkUuid?: string;
  sdkSessionId?: string;
  /** Set when the frame was produced inside a subagent invocation, naming the owning tool call. */
  parentToolUseId?: string;
  subagentType?: string;
};

/**
 * Maps an Anthropic `stop_reason` onto the provider-agnostic finish reasons in `@dxos/types`.
 */
const finishReason = (stopReason: string | null): ContentBlock.FinishReason => {
  switch (stopReason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool-calls';
    case 'pause_turn':
      return 'pause';
    case 'refusal':
      return 'content-filter';
    case null:
      return 'unknown';
    default:
      return 'other';
  }
};

/**
 * The turn's conversational model. Even a trivial turn reports several — the SDK runs auxiliary
 * work (e.g. session titling) on a small model — so the main one is the entry with the most output
 * tokens, reported by its canonical name (the raw key can carry a context suffix like `[1m]`).
 */
const mainModel = (modelUsage: Record<string, unknown>): string | undefined => {
  let best: { key: string; outputTokens: number; canonical?: string } | undefined;
  for (const [key, value] of Object.entries(modelUsage)) {
    const usage = value as { outputTokens?: number; canonicalModel?: string };
    const outputTokens = usage?.outputTokens ?? 0;
    if (!best || outputTokens > best.outputTokens) {
      best = { key, outputTokens, canonical: usage?.canonicalModel };
    }
  }
  return best ? (best.canonical ?? best.key) : undefined;
};

const resultBlock = (result: SDKResultMessage): ContentBlock.Stats => ({
  _tag: 'stats',
  model: mainModel(result.modelUsage ?? {}),
  usage: {
    inputTokens: result.usage?.input_tokens,
    outputTokens: result.usage?.output_tokens,
    totalTokens:
      result.usage?.input_tokens !== undefined && result.usage?.output_tokens !== undefined
        ? result.usage.input_tokens + result.usage.output_tokens
        : undefined,
  },
  errors: result.permission_denials?.length || undefined,
  duration: result.duration_ms,
  finishReason: result.subtype === 'success' ? finishReason(result.stop_reason) : 'error',
});

/**
 * Projects the Claude Agent SDK's message stream onto ECHO messages.
 *
 * Stateful because the SDK reports a tool result without the tool's name, which `ContentBlock.ToolResult`
 * requires; the name is recovered by correlating with the preceding `tool_use` in stream order.
 */
export class Projector {
  readonly #toolNames = new Map<string, string>();
  readonly #denials: SDKPermissionDenial[] = [];

  /**
   * Every permission denial reported across the projected stream. `result.permission_denials` is the
   * SDK's authoritative record — the advisory `permission_denied` frames can race — and it is what a
   * real approval surface should be designed against.
   */
  get denials(): readonly SDKPermissionDenial[] {
    return this.#denials;
  }

  /**
   * Projects one SDK frame. Returns `undefined` for frames that carry no conversation content
   * (session init, stream deltas, control traffic).
   */
  message(sdk: SDKMessage): Message.Message | undefined {
    switch (sdk.type) {
      case 'assistant':
        return this.#make(sdk, 'assistant', this.#assistantBlocks(sdk.message.content));
      case 'user':
        return this.#userMessage(sdk);
      case 'result':
        this.#denials.push(...(sdk.permission_denials ?? []));
        return this.#make(sdk, 'assistant', [resultBlock(sdk)]);
      default:
        return undefined;
    }
  }

  #make(sdk: SDKMessage, role: 'user' | 'assistant' | 'tool', blocks: ContentBlock.Any[]): Message.Message | undefined {
    if (blocks.length === 0) {
      return undefined;
    }

    const frame = sdk as { uuid?: string; session_id?: string; parent_tool_use_id?: string | null; timestamp?: string };
    const properties: SdkProperties = {
      sdkUuid: frame.uuid,
      sdkSessionId: frame.session_id,
      parentToolUseId: frame.parent_tool_use_id ?? undefined,
      subagentType: (sdk as { subagent_type?: string }).subagent_type,
    };

    return Message.make({
      created: frame.timestamp ?? new Date().toISOString(),
      sender: role,
      threadId: frame.session_id,
      blocks,
      properties,
    });
  }

  #userMessage(sdk: Extract<SDKMessage, { type: 'user' }>): Message.Message | undefined {
    const { content } = sdk.message;
    if (typeof content === 'string') {
      return this.#make(sdk, 'user', [{ _tag: 'text', text: content }]);
    }

    const blocks = this.#userBlocks(content);
    // A frame carrying tool results is the transport for tool output, not a turn the user authored.
    const role = blocks.some((block) => block._tag === 'toolResult') ? 'tool' : 'user';
    return this.#make(sdk, role, blocks);
  }

  #assistantBlocks(content: readonly unknown[]): ContentBlock.Any[] {
    return content.flatMap((raw): ContentBlock.Any[] => {
      const block = raw as Record<string, any>;
      switch (block.type) {
        case 'text':
          return [{ _tag: 'text', text: block.text } satisfies ContentBlock.Text];
        case 'thinking':
          return [{ _tag: 'reasoning', reasoningText: block.thinking, signature: block.signature }];
        case 'redacted_thinking':
          return [{ _tag: 'reasoning', redactedText: block.data }];
        case 'tool_use':
          this.#toolNames.set(block.id, block.name);
          return [
            {
              _tag: 'toolCall',
              toolCallId: block.id,
              name: block.name,
              input: JSON.stringify(block.input ?? {}),
              providerExecuted: false,
            } satisfies ContentBlock.ToolCall,
          ];
        default:
          log('unmapped assistant block', { type: block.type });
          return [];
      }
    });
  }

  #userBlocks(content: readonly unknown[]): ContentBlock.Any[] {
    return content.flatMap((raw): ContentBlock.Any[] => {
      const block = raw as Record<string, any>;
      switch (block.type) {
        case 'text':
          return [{ _tag: 'text', text: block.text } satisfies ContentBlock.Text];
        case 'tool_result': {
          const text = typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? null);
          return [
            {
              _tag: 'toolResult',
              toolCallId: block.tool_use_id,
              name: this.#toolNames.get(block.tool_use_id) ?? UNKNOWN_TOOL_NAME,
              providerExecuted: false,
              ...(block.is_error ? { error: text } : { result: text }),
            } satisfies ContentBlock.ToolResult,
          ];
        }
        default:
          log('unmapped user block', { type: block.type });
          return [];
      }
    });
  }
}
