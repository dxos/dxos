//
// Copyright 2024 DXOS.org
//

// Turns a parsed conversation into a chronologically-ordered sequence of Whisper-shaped
// transcript batches, one per (speaker, utterance) pair. Each batch carries a virtual
// timestamp (ms since the conversation start) and the speaker label so consumers can fan
// out per-stream — analogous to two microphones being transcribed in parallel.
//
// The simulator does NOT do any wall-clock waiting. Tests drive virtual time via
// `vi.useFakeTimers()` or step through the batches directly; production code wouldn't use
// this module at all.

import { type ContentBlock } from '@dxos/types';

import type { ConversationUtterance, ParsedConversation } from './conversation-parser';

export type StreamSimulatorOptions = {
  /**
   * Average speaking rate, words per second. Used to assign a virtual duration to each
   * utterance so consecutive utterances land at realistic offsets.
   * @default 2.5 (≈150 wpm — typical conversational pace)
   */
  wordsPerSecond?: number;

  /**
   * Gap between consecutive utterances in seconds. Models a brief pause for turn-taking
   * even when speakers don't actually overlap.
   * @default 0.5
   */
  gapSeconds?: number;

  /**
   * Whisper batches typically arrive in chunks of N seconds rather than per-utterance.
   * When set, utterances shorter than `batchSeconds` are merged into the same batch as
   * the following utterance from the same speaker. `0` disables merging — every utterance
   * is its own batch.
   * @default 0
   */
  batchSeconds?: number;
};

export type SimulatedBatch = {
  /** Speaker label from the fixture (`A`, `B`, …). Maps to a virtual `identityDid`. */
  speaker: string;
  /** ms offset from the conversation start when this batch is delivered. */
  offsetMs: number;
  /** Whisper-shaped transcript blocks (raw text, no enrichment). */
  blocks: ContentBlock.Transcript[];
};

/**
 * Build the chronological batch schedule for a parsed conversation. The result is a
 * pure data structure — consumers iterate and drive virtual time themselves.
 */
export const simulateStream = (
  conversation: ParsedConversation,
  options: StreamSimulatorOptions = {},
): SimulatedBatch[] => {
  const wordsPerSecond = options.wordsPerSecond ?? 2.5;
  const gapSeconds = options.gapSeconds ?? 0.5;
  const batchSeconds = options.batchSeconds ?? 0;

  // Guard against divide-by-zero / NaN / negative inputs — `wordsPerSecond` divides into a
  // duration below, and the other knobs feed into offsets that must be finite.
  if (!Number.isFinite(wordsPerSecond) || wordsPerSecond <= 0) {
    throw new Error(`simulateStream: wordsPerSecond must be a finite number > 0 (got ${wordsPerSecond}).`);
  }
  if (!Number.isFinite(gapSeconds) || gapSeconds < 0) {
    throw new Error(`simulateStream: gapSeconds must be a finite number >= 0 (got ${gapSeconds}).`);
  }
  if (!Number.isFinite(batchSeconds) || batchSeconds < 0) {
    throw new Error(`simulateStream: batchSeconds must be a finite number >= 0 (got ${batchSeconds}).`);
  }

  const conversationStart = Date.UTC(2024, 0, 1, 12, 0, 0); // deterministic, ignored by callers
  let cursorMs = 0;
  const batches: SimulatedBatch[] = [];

  // Optionally merge same-speaker consecutive utterances until they reach `batchSeconds`.
  const grouped: { speaker: string; utterances: ConversationUtterance[] }[] = [];
  if (batchSeconds === 0) {
    for (const u of conversation.utterances) {
      grouped.push({ speaker: u.speaker, utterances: [u] });
    }
  } else {
    let pending: { speaker: string; utterances: ConversationUtterance[]; words: number } | undefined;
    for (const u of conversation.utterances) {
      const words = utteranceWordCount(u.text);
      if (pending && pending.speaker === u.speaker && pending.words / wordsPerSecond < batchSeconds) {
        pending.utterances.push(u);
        pending.words += words;
      } else {
        if (pending) {
          grouped.push({ speaker: pending.speaker, utterances: pending.utterances });
        }
        pending = { speaker: u.speaker, utterances: [u], words };
      }
    }
    if (pending) {
      grouped.push({ speaker: pending.speaker, utterances: pending.utterances });
    }
  }

  for (const group of grouped) {
    const startMs = cursorMs;
    const blocks: ContentBlock.Transcript[] = [];
    let segmentCursorMs = cursorMs;
    for (const u of group.utterances) {
      const durationMs = Math.max(500, (utteranceWordCount(u.text) / wordsPerSecond) * 1_000);
      blocks.push({
        _tag: 'transcript',
        started: new Date(conversationStart + segmentCursorMs).toISOString(),
        text: u.text,
      });
      segmentCursorMs += durationMs;
    }
    batches.push({ speaker: group.speaker, offsetMs: startMs, blocks });
    cursorMs = segmentCursorMs + gapSeconds * 1_000;
  }

  return batches;
};

const utteranceWordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
