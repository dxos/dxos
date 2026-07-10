//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import {
  LIMIT,
  extractDocFactsForMessages,
  fixtureExists,
  loadFixtureMessages,
  round,
  selectVariants,
  trackProgress,
  writeResults,
} from '../testing/harness';
import { DEFAULT_HTML_VS_TEXT_N } from './defs';

// Small by design: HTML bodies are large, so a handful of messages already shows the difference.
const N = LIMIT ?? DEFAULT_HTML_VS_TEXT_N;

/**
 * Benchmarks fact extraction over the SAME messages using their native `text/html` vs `text/plain`
 * MIME parts, under one fixed model — the actual ingestion choice. HTML inflates the extractor input
 * (more characters → more chunks → more LLM calls), so this quantifies input size, facts, and
 * latency for each part. Restricted to messages that carry BOTH parts (aligned by index).
 */
describe.skipIf(!fixtureExists())('benchmark text/html vs text/plain email input', () => {
  test(
    'compares fact extraction over the html vs plain MIME parts',
    async ({ expect }) => {
      const variant = selectVariants()[0];

      // Load both bodies for the same messages (aligned by created-sort + slice), then keep only the
      // pairs where both the html and plain parts have content.
      const htmlAll = loadFixtureMessages({ limit: N, body: 'html' });
      const plainAll = loadFixtureMessages({ limit: N, body: 'plain' });
      const pairs = htmlAll
        .map((message, index) => [message, plainAll[index]] as const)
        .filter(([html, plain]) => Message.extractText(html).length > 0 && Message.extractText(plain).length > 0);
      const inputs = [
        { mode: 'text/html', messages: pairs.map(([html]) => html) },
        { mode: 'text/plain', messages: pairs.map(([, plain]) => plain) },
      ];

      const rows: Record<string, unknown>[] = [];
      for (const { mode, messages } of inputs) {
        const progress = trackProgress(`html-vs-text:${mode}`, messages.length);
        const start = performance.now();
        const { facts, inputChars } = await extractDocFactsForMessages(variant, messages, () => progress.advance());
        progress.done();
        const durationMs = Math.round(performance.now() - start);
        const row = {
          mode,
          model: variant.name,
          messages: messages.length,
          inputChars,
          avgInputChars: round(inputChars / Math.max(1, messages.length)),
          facts,
          factsPerMessage: round(facts / Math.max(1, messages.length)),
          durationMs,
          msPerMessage: round(durationMs / Math.max(1, messages.length)),
        };
        rows.push(row);
        log.info('html-vs-text', row);
      }

      // Head-to-head ratio (plain as the baseline).
      const html = rows.find((row) => row.mode === 'text/html')!;
      const plain = rows.find((row) => row.mode === 'text/plain')!;
      const ratio = {
        inputCharsHtmlOverPlain: round((html.inputChars as number) / Math.max(1, plain.inputChars as number)),
        durationHtmlOverPlain: round((html.durationMs as number) / Math.max(1, plain.durationMs as number)),
      };

      writeResults('html-vs-text', {
        name: 'html-vs-text',
        generatedAt: new Date().toISOString(),
        model: variant.name,
        messagesWithBothParts: pairs.length,
        ratio,
        rows,
      });

      expect(rows.length).toBe(2);
    },
    30 * 60_000,
  );
});
