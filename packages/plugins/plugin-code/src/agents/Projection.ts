//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as acp from '@agentclientprotocol/sdk';

import { type ContentBlock, Message } from '@dxos/types';

/** Where a message came from in the agent's own transcript, for de-duplicating a replay. */
export const ACP_MESSAGE_ID = 'acpMessageId';

type Run = { kind: 'text' | 'reasoning'; messageId?: string; content: string };

type Tool = {
  name: string;
  title: string;
  input: unknown;
  /** The latest content the agent reported; a completion often reports none of its own. */
  content: acp.ToolCallContent[];
  /** Whether the call's block has been emitted; a call is emitted once, before its result. */
  emitted: boolean;
};

export type TurnEnd = {
  stopReason: acp.StopReason;
  usage?: acp.Usage | null;
  durationMs: number;
  model?: string;
};

/**
 * Folds one turn's ACP session updates into chat messages, in the order the chat should show them.
 *
 * Text and thought chunks accumulate until the agent starts another message or does something else;
 * a tool call is shown once its title settles (on its first status change, or when a permission
 * request is about it) and its result when it completes. Everything else the protocol reports
 * (usage, commands, modes, plans) is not part of the transcript.
 */
export class TurnProjection {
  #run: Run | undefined;
  readonly #tools = new Map<string, Tool>();

  apply(update: acp.SessionUpdate): Message.Message[] {
    switch (update.sessionUpdate) {
      case 'agent_message_chunk':
      case 'agent_thought_chunk': {
        const kind = update.sessionUpdate === 'agent_message_chunk' ? 'text' : 'reasoning';
        const text = update.content.type === 'text' ? update.content.text : '';
        const messageId = update.messageId ?? undefined;
        const flushed =
          this.#run && (this.#run.kind !== kind || this.#run.messageId !== messageId) ? this.#flush() : [];
        this.#run ??= { kind, messageId, content: '' };
        this.#run.content += text;
        return flushed;
      }

      case 'tool_call': {
        const flushed = this.#flush();
        this.#tools.set(update.toolCallId, {
          name: update.name ?? update.title,
          title: update.title,
          input: update.rawInput,
          content: update.content ?? [],
          emitted: false,
        });
        return [
          ...flushed,
          ...this.#settle(update.toolCallId, update.status ?? undefined, update.content ?? undefined),
        ];
      }

      case 'tool_call_update': {
        const tool = this.#tools.get(update.toolCallId);
        if (!tool) {
          return [];
        }
        if (update.title) {
          tool.title = update.title;
        }
        if (update.rawInput !== undefined && update.rawInput !== null) {
          tool.input = update.rawInput;
        }
        if (update.content && update.content.length > 0) {
          tool.content = update.content;
        }
        return [
          ...this.#flush(),
          ...this.#settle(update.toolCallId, update.status ?? undefined, update.content ?? undefined),
        ];
      }

      default:
        return [];
    }
  }

  /** Emits the call a permission request is about, so its card shows before the request. */
  reveal(toolCallId: string): Message.Message[] {
    const tool = this.#tools.get(toolCallId);
    return tool && !tool.emitted ? [...this.#flush(), this.#call(toolCallId, tool)] : this.#flush();
  }

  /** Closes the turn: whatever text is still open, then the turn's stats. */
  finish(end: TurnEnd): Message.Message[] {
    const stats: ContentBlock.Stats = {
      _tag: 'stats',
      model: end.model,
      duration: end.durationMs,
      finishReason: finishReason(end.stopReason),
      usage: end.usage
        ? {
            inputTokens: end.usage.inputTokens,
            outputTokens: end.usage.outputTokens,
            totalTokens: end.usage.totalTokens,
          }
        : undefined,
    };
    return [...this.#flush(), Message.make({ sender: 'assistant', blocks: [stats] })];
  }

  #flush(): Message.Message[] {
    const run = this.#run;
    this.#run = undefined;
    if (!run || !run.content) {
      return [];
    }
    const block: ContentBlock.Any =
      run.kind === 'text' ? { _tag: 'text', text: run.content } : { _tag: 'reasoning', reasoningText: run.content };
    return [
      Message.make({
        sender: 'assistant',
        blocks: [block],
        properties: run.messageId ? { [ACP_MESSAGE_ID]: run.messageId } : undefined,
      }),
    ];
  }

  #settle(
    toolCallId: string,
    status: acp.ToolCallStatus | undefined,
    content: acp.ToolCallContent[] | undefined,
  ): Message.Message[] {
    const tool = this.#tools.get(toolCallId);
    if (!tool || status === undefined || status === 'pending') {
      return [];
    }
    const messages = tool.emitted ? [] : [this.#call(toolCallId, tool)];
    if (status === 'completed' || status === 'failed') {
      this.#tools.delete(toolCallId);
      const output = describe(content && content.length > 0 ? content : tool.content);
      const result: ContentBlock.ToolResult = {
        _tag: 'toolResult',
        toolCallId,
        name: tool.name,
        providerExecuted: false,
        ...(status === 'failed' ? { error: output || 'failed' } : { result: output }),
      };
      messages.push(Message.make({ sender: 'tool', blocks: [result] }));
    }
    return messages;
  }

  #call(toolCallId: string, tool: Tool): Message.Message {
    tool.emitted = true;
    const call: ContentBlock.ToolCall = {
      _tag: 'toolCall',
      toolCallId,
      name: tool.name,
      operationName: tool.title,
      input: JSON.stringify(tool.input ?? {}),
      providerExecuted: false,
    };
    return Message.make({ sender: 'assistant', blocks: [call] });
  }
}

/** A tool's reported output as text: what it said, the files it changed, or its terminal. */
const describe = (content: acp.ToolCallContent[]): string =>
  content
    .map((item) => {
      switch (item.type) {
        case 'content':
          return item.content.type === 'text' ? item.content.text : `[${item.content.type}]`;
        case 'diff':
          return `Edited ${item.path}`;
        case 'terminal':
          return `[terminal ${item.terminalId}]`;
      }
    })
    .join('\n');

const finishReason = (stopReason: acp.StopReason): ContentBlock.FinishReason => {
  switch (stopReason) {
    case 'end_turn':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'refusal':
      return 'content-filter';
    default:
      return 'other';
  }
};
