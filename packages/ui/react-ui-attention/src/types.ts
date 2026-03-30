//
// Copyright 2025 DXOS.org
//

export type Attention = {
  hasAttention: boolean;
  isAncestor: boolean;
  isRelated: boolean;
};

export type CurrentState = {
  current: string[];
};

/**
 * Entry in the attention history ring buffer.
 */
export type AttentionHistoryEntry = {
  /** The attention ID (graph node ID). */
  id: string;
  /** Timestamp when this ID received attention. */
  timestamp: number;
};
