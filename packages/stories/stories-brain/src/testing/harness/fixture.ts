//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';

import { type Database, Feed } from '@dxos/echo';
import { normalizeText } from '@dxos/markdown';
import { Message } from '@dxos/types';

import { FIXTURE, LIMIT } from './config';

export const fixtureExists = (): boolean => existsSync(FIXTURE);

/**
 * Normalizes a message body to clean Markdown. Gmail bodies are HTML; the raw markup pollutes
 * embeddings, wastes summarization tokens, and is unreadable in the responses markdown — so message
 * text is cleaned once at load and every downstream consumer (facts, embeddings, summaries, display)
 * gets structured prose. `@dxos/markdown` `normalizeText` converts HTML via turndown and passes
 * plaintext through, mirroring the ingestion pipeline (see the html-to-markdown benchmark).
 */
export const toMarkdown = (text: string): string => normalizeText(text);

/** Which MIME body to use: prefer the native plain part, keep raw HTML, or take the native plain part. */
export type BodyMode = 'auto' | 'html' | 'plain';

// A text/plain part is usable if it has real content — some fixture messages carry a degenerate
// plain block (e.g. the literal "False") from a capture bug; those fall back to the HTML part.
const isUsablePlain = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.length >= 20 && trimmed.toLowerCase() !== 'false';
};

/**
 * Selects the message body from its MIME text blocks. Emails carry `text/html` and/or `text/plain`
 * alternatives; `auto` prefers the native plain part (else converts the HTML to Markdown), `plain`/
 * `html` force a specific part (for the HTML-vs-text benchmark). Returns '' when the requested part
 * is absent.
 */
const pickBody = (blocks: any[], mode: BodyMode): string => {
  const textBlocks = blocks.filter((block) => block?._tag === 'text' && typeof block.text === 'string');
  const html = textBlocks.find((block) => block.mimeType === 'text/html');
  const plain = textBlocks.find((block) => block.mimeType === 'text/plain');
  if (mode === 'html') {
    return html?.text ?? '';
  }
  if (mode === 'plain') {
    return plain && isUsablePlain(plain.text) ? plain.text : '';
  }
  // auto: native plain if usable, else HTML→Markdown, else the normalized remaining text blocks.
  if (plain && isUsablePlain(plain.text)) {
    return plain.text;
  }
  if (html) {
    return toMarkdown(html.text);
  }
  return toMarkdown(textBlocks.map((block) => block.text).join('\n'));
};

// Reconstructs a message from a serialized fixture entry, minting a fresh id, and collapsing its MIME
// text blocks into ONE clean text block per `mode` (so `Message.extractText` no longer concatenates
// the html + plain alternatives). Retains sender, timestamp, thread, and properties (subject, to, cc,
// references, snippet). Cross-object refs (`attachments`) are dropped — not in the fixture.
const reconstructMessage = (json: any, mode: BodyMode): Message.Message =>
  Message.make({
    created: json.created,
    sender: json.sender,
    blocks: [{ _tag: 'text', text: pickBody(json.blocks ?? [], mode) }],
    threadId: json.threadId,
    properties: json.properties,
  });

/**
 * Loads and reconstructs the fixture messages, sorted oldest-first by `created` and capped at
 * `limit` (defaults to the `LIMIT` env). The sort mirrors real mailbox ingestion order: the fact
 * pipeline's high-water cursor advances by timestamp, so an unsorted (e.g. newest-first) feed would
 * skip every message older than the first one processed. `body` selects the MIME part (default
 * `auto` = prefer native plain, else stripped HTML).
 */
export const loadFixtureMessages = (options: { limit?: number; body?: BodyMode } = {}): Message.Message[] => {
  const { limit = LIMIT, body = 'auto' } = options;
  const entries = JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown[];
  const messages = entries
    .map((entry) => reconstructMessage(entry, body))
    .sort((a, b) => a.created.localeCompare(b.created));
  return limit !== undefined ? messages.slice(0, limit) : messages;
};

/** Adds a fresh feed seeded with the given messages to the database. */
export const seedFeed = async (db: Database.Database, messages: readonly Message.Message[]): Promise<Feed.Feed> => {
  const feed = db.add(Feed.make({ name: 'mailbox' }));
  await db.appendToFeed(feed, [...messages]);
  await db.flush();
  return feed;
};
