//
// Copyright 2026 DXOS.org
//

export type InspectorStepType =
  | 'user-message'
  | 'assistant-message'
  | 'tool-call'
  | 'tool-result'
  | 'reasoning'
  | 'stats'
  | 'running'
  | 'turn-start'
  | 'turn-completed'
  | 'input-received';

export type InspectorStep = {
  /** Unique identifier for this step. */
  id: string;
  /** Timestamp of the event. */
  timestamp: number;
  /** Step type for rendering. */
  type: InspectorStepType;
  /** Short label for the timeline. */
  label: string;
  /** Whether this step is still in progress. */
  pending: boolean;
  /** Tool name (for tool-call/tool-result). */
  toolName?: string;
  /** Tool input as JSON string (for tool-call). */
  toolInput?: string;
  /** Tool result as string (for tool-result). */
  toolResult?: string;
  /** Tool call ID (for linking calls to results). */
  toolCallId?: string;
  /** Error message (for tool-result). */
  error?: string;
  /** Full text content (for messages/reasoning). */
  content?: string;
  /** Token count (for stats). */
  tokens?: { input?: number; output?: number };
  /** Duration in ms (for stats). */
  duration?: number;
};
