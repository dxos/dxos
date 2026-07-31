//
// Copyright 2026 DXOS.org
//

import { type ContentBlock } from '@dxos/types';

/**
 * Events flowing through the pipeline stream. The runtime owns this continuous stream and slices
 * it into bounded windows that drive discrete stage invocations.
 */
export type TranscriptEvent =
  | { kind: 'block'; block: ContentBlock.Transcript }
  | { kind: 'silence'; sinceMs: number }
  | { kind: 'tick' };

export const TranscriptEvent = Object.freeze({
  /** A new transcript block was appended by the ASR source. */
  block: (block: ContentBlock.Transcript): TranscriptEvent => ({ kind: 'block', block }),
  /** The speaker has been silent for `sinceMs` milliseconds. */
  silence: (sinceMs: number): TranscriptEvent => ({ kind: 'silence', sinceMs }),
  /** Periodic timer tick (drives periodic-trigger stages). */
  tick: (): TranscriptEvent => ({ kind: 'tick' }),
});
