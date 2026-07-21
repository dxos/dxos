//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';
import { htmlToMarkdown } from '@dxos/markdown';
import { Message } from '@dxos/types';

import { fixtureExists, loadFixtureMessages, round, trackProgress, writeResults } from '../testing/harness';

/**
 * Measures throughput of `@dxos/markdown`'s `htmlToMarkdown` (linkedom + turndown) over the mailbox
 * feed's raw `text/html` bodies — a deterministic, no-LLM conversion. Reports input/output size,
 * compression, and chars/sec, to gauge whether markdown conversion is cheap enough to run inline in
 * the ingestion pipeline (vs the current regex `stripHtml`).
 */
describe.skipIf(!fixtureExists())('benchmark html→markdown throughput', () => {
  test('converts message HTML bodies to markdown', ({ expect }) => {
    const messages = loadFixtureMessages({ body: 'html' }).filter((message) => Message.extractText(message).length > 0);
    const progress = trackProgress('html-to-markdown', messages.length);

    let inputChars = 0;
    let outputChars = 0;
    const start = performance.now();
    for (const message of messages) {
      const html = Message.extractText(message);
      inputChars += html.length;
      outputChars += htmlToMarkdown(html).length;
      progress.advance();
    }
    const durationMs = Math.round(performance.now() - start);
    progress.done();

    const seconds = Math.max(durationMs, 1) / 1000;
    const report = {
      name: 'html-to-markdown',
      generatedAt: new Date().toISOString(),
      messages: messages.length,
      inputChars,
      outputChars,
      compression: round(outputChars / Math.max(1, inputChars)),
      durationMs,
      msPerMessage: round(durationMs / Math.max(1, messages.length)),
      charsPerSecond: Math.round(inputChars / seconds),
    };
    log.info('html-to-markdown', report);
    writeResults('html-to-markdown', report);

    expect(messages.length).toBeGreaterThan(0);
    expect(outputChars).toBeGreaterThan(0);
  });
});
