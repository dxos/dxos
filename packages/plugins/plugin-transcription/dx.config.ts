//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.transcription',
    name: 'Transcription',
    description: trim`
      Real-time voice-to-text transcription for DXOS Composer.
      Captures microphone audio in short PCM chunks, batches them into WAV payloads, and streams
      the results to a Whisper-compatible speech-recognition endpoint.
      Transcribed segments are timestamped, deduplicated across chunk boundaries, and persisted
      as Message objects in an ECHO Feed so that every participant in a shared space sees the
      live transcript without any manual sync step.

      Each recording session is represented as a Transcript object linked to its Feed.
      The read-only editor renders messages with speaker bylines and wall-clock timestamps,
      supporting markdown decoration and document preview.
      An optional message enricher pipeline lets plugins annotate messages before they are
      committed — for example, to attach speaker identity from a calls service.

      The plugin ships two blueprint-compatible operations: Open (loads and formats a transcript
      for reading by an AI assistant) and Summarize (sends the transcript text to an LLM and
      returns a structured Markdown summary with key points, verbatim quotes, and actionable
      tasks extracted from the conversation).

      A sentence-normalization pass merges raw word-level tokens from the recognizer into
      grammatically complete sentences, improving readability of the stored transcript without
      altering the underlying audio timeline.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-transcription',
    icon: { key: 'ph--microphone--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    screenshots: [],
  },
});
