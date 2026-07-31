//
// Copyright 2026 DXOS.org
//

import { type ScriptedBlock } from './scripted-source';

/** A short multi-utterance meeting transcript (raw, lower-cased — as Whisper tends to emit). */
export const SAMPLE_MEETING: readonly ScriptedBlock[] = Object.freeze([
  { text: 'so i think we should ship munich on friday' },
  { text: 'lets confirm the plan with anna first' },
  { text: 'agreed we can review it tomorrow' },
]);

/** A single-speaker dictation transcript (for the Notes preset). */
export const SAMPLE_NOTES: readonly ScriptedBlock[] = Object.freeze([
  { text: 'remember to email the quarterly report' },
  { text: 'and schedule a follow up with the design team' },
]);
