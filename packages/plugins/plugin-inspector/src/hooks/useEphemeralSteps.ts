//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PartialBlock,
  CompleteBlock,
  AgentTurnStarted,
  AgentTurnCompleted,
  ToolCallStarted,
  ToolCallCompleted,
  AgentInputReceived,
} from '@dxos/assistant';
import { Trace } from '@dxos/functions';

import { type InspectorStep } from '#types';

/**
 * Subscribes to a feed's persisted trace messages and normalizes them into InspectorStep[].
 * Uses the same pattern as TracePanel — reads CompleteBlock events from feeds.
 */
export const useEphemeralSteps = (traceMessages: readonly Trace.Message[]): InspectorStep[] => {
  const [steps, setSteps] = useState<InspectorStep[]>([]);
  const processedCountRef = useRef(0);
  const messagesIdentityRef = useRef<readonly Trace.Message[] | undefined>(undefined);

  useEffect(() => {
    // Reset internal state when the trace-messages array identity changes
    // (e.g. space switched → a new atom yields a different array). Otherwise
    // a stale processedCountRef could skip events or the old step list could
    // leak into the new space.
    if (messagesIdentityRef.current !== traceMessages) {
      messagesIdentityRef.current = traceMessages;
      processedCountRef.current = 0;
      setSteps([]);
      if (traceMessages.length === 0) {
        return;
      }
    }

    if (traceMessages.length <= processedCountRef.current) {
      return;
    }

    const newMessages = traceMessages.slice(processedCountRef.current);
    processedCountRef.current = traceMessages.length;

    const newSteps: InspectorStep[] = [];

    for (const message of newMessages) {
      for (const event of message.events) {
        const step = normalizeEvent(event, message);
        if (step) {
          newSteps.push(step);
        }
      }
    }

    if (newSteps.length > 0) {
      setSteps((prev) => [...prev, ...newSteps]);
    }
  }, [traceMessages]);


  return steps;
};

/** Resets step state. */
const normalizeEvent = (event: Trace.Event, message: Trace.Message): InspectorStep | undefined => {
  const baseId = `${message.id}-${event.timestamp}`;

  if (Trace.isOfType(CompleteBlock, event)) {
    const block = event.data.block;
    switch (block._tag) {
      case 'text': {
        const isUser = event.data.role === 'user';
        return {
          id: `${baseId}-text-${event.data.messageId}`,
          timestamp: event.timestamp,
          type: isUser ? 'user-message' : 'assistant-message',
          label: block.text.slice(0, 80),
          pending: false,
          content: block.text,
        };
      }
      case 'toolCall':
        return {
          id: `${baseId}-tc-${block.toolCallId}`,
          timestamp: event.timestamp,
          type: 'tool-call',
          label: block.name,
          pending: false,
          toolName: block.name,
          toolInput: block.input,
          toolCallId: block.toolCallId,
        };
      case 'toolResult':
        return {
          id: `${baseId}-tr-${block.toolCallId}`,
          timestamp: event.timestamp,
          type: 'tool-result',
          label: block.name ?? 'Tool result',
          pending: false,
          toolName: block.name,
          toolResult: block.result,
          toolCallId: block.toolCallId,
          error: block.error,
        };
      case 'reasoning':
        return {
          id: `${baseId}-reasoning-${event.data.messageId}`,
          timestamp: event.timestamp,
          type: 'reasoning',
          label: 'Thinking...',
          pending: false,
          content: block.reasoningText,
        };
      case 'stats':
        return {
          id: `${baseId}-stats`,
          timestamp: event.timestamp,
          type: 'stats',
          label: 'Execution stats',
          pending: false,
          tokens: { input: block.usage?.inputTokens, output: block.usage?.outputTokens },
          duration: block.duration,
        };
      default:
        return undefined;
    }
  }

  if (Trace.isOfType(PartialBlock, event)) {
    const block = event.data.block;
    switch (block._tag) {
      case 'text':
        return {
          id: `${baseId}-partial-text-${event.data.messageId}`,
          timestamp: event.timestamp,
          type: event.data.role === 'user' ? 'user-message' : 'assistant-message',
          label: block.text.slice(0, 80),
          pending: true,
          content: block.text,
        };
      case 'reasoning':
        return {
          id: `${baseId}-partial-reasoning`,
          timestamp: event.timestamp,
          type: 'reasoning',
          label: 'Thinking...',
          pending: true,
          content: block.reasoningText,
        };
      default:
        return undefined;
    }
  }

  if (Trace.isOfType(AgentTurnStarted, event)) {
    return {
      id: `${baseId}-turn-start`,
      timestamp: event.timestamp,
      type: 'turn-start',
      label: `Turn started (${event.data.historyLength} messages in context)`,
      pending: false,
    };
  }

  if (Trace.isOfType(AgentTurnCompleted, event)) {
    return {
      id: `${baseId}-turn-completed`,
      timestamp: event.timestamp,
      type: 'turn-completed',
      label: event.data.done ? 'Turn completed' : `Turn completed (${event.data.messageCount} messages, continuing)`,
      pending: false,
    };
  }

  if (Trace.isOfType(ToolCallStarted, event)) {
    return {
      id: `${baseId}-tcs-${event.data.toolCallId}`,
      timestamp: event.timestamp,
      type: 'tool-call',
      label: event.data.name,
      pending: true,
      toolName: event.data.name,
      toolCallId: event.data.toolCallId,
    };
  }

  if (Trace.isOfType(ToolCallCompleted, event)) {
    return {
      id: `${baseId}-tcc-${event.data.toolCallId}`,
      timestamp: event.timestamp,
      type: 'tool-result',
      label: event.data.name,
      pending: false,
      toolName: event.data.name,
      toolCallId: event.data.toolCallId,
      error: event.data.isError ? 'Error' : undefined,
    };
  }

  if (Trace.isOfType(AgentInputReceived, event)) {
    return {
      id: `${baseId}-input`,
      timestamp: event.timestamp,
      type: 'input-received',
      label: `Received ${event.data.inputType} (${event.data.contentLength} chars)`,
      pending: false,
    };
  }

  return undefined;
};
