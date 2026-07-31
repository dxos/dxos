//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';

import { TranscriptEvent } from '../types';

export type ScriptedBlock = { text: string; started?: string };

export type ScriptedSourceOptions = {
  /** Append a trailing silence event (drives on-silence stages). Default: true. */
  readonly silence?: boolean;
};

/**
 * Build a deterministic {@link TranscriptEvent} stream from a fixture of blocks. Emits a `block`
 * event per entry, then (by default) a trailing `silence`. No audio or network — for testbench and CI.
 */
export const scriptedSource = (
  blocks: readonly ScriptedBlock[],
  options: ScriptedSourceOptions = {},
): Stream.Stream<TranscriptEvent> => {
  const events: TranscriptEvent[] = blocks.map((block, index) =>
    TranscriptEvent.block({
      _tag: 'transcript',
      started: block.started ?? new Date(index * 1000).toISOString(),
      text: block.text,
    }),
  );
  if (options.silence !== false) {
    events.push(TranscriptEvent.silence(5000));
  }
  return Stream.fromIterable(events);
};
