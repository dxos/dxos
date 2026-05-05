//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { aiMatch } from './ai-match';

type Note = { id: string; title: string; body: string };
type Card = { ref: string; name: string };

const notes: Note[] = [
  { id: 'n1', title: 'Kickoff with Acme', body: 'Discussed ingest pipeline.' },
  { id: 'n2', title: 'Lunch', body: 'Not about anything in particular.' },
];
const cards: Card[] = [
  { ref: 'c1', name: 'Acme integration' },
  { ref: 'c2', name: 'Marketing site' },
];

const mockAnthropic = (body: unknown, status = 200) =>
  vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

describe('aiMatch', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('rejoins matches with original source/target objects', async ({ expect }) => {
    globalThis.fetch = mockAnthropic({
      content: [
        {
          text: JSON.stringify([
            { sourceId: 'n1', targetId: 'c1', confidence: 'high', reasoning: 'Both reference Acme' },
          ]),
        },
      ],
    }) as any;

    const results = await aiMatch<Note, Card>({
      source: notes,
      target: cards,
      summarizeSource: (note) => ({ title: note.title, body: note.body }),
      summarizeTarget: (card) => ({ name: card.name }),
      sourceId: (note) => note.id,
      targetId: (card) => card.ref,
      task: 'Match notes to cards.',
      apiKey: 'test-key',
    });

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe(notes[0]);
    expect(results[0].target).toBe(cards[0]);
    expect(results[0].confidence).toBe('high');
    expect(results[0].reasoning).toBe('Both reference Acme');
  });

  test('strips code fences around JSON', async ({ expect }) => {
    globalThis.fetch = mockAnthropic({
      content: [
        {
          text: '```json\n[{"sourceId":"n1","targetId":"c1","confidence":"low","reasoning":"meh"}]\n```',
        },
      ],
    }) as any;

    const results = await aiMatch<Note, Card>({
      source: notes,
      target: cards,
      summarizeSource: (note) => ({ title: note.title }),
      summarizeTarget: (card) => ({ name: card.name }),
      sourceId: (note) => note.id,
      targetId: (card) => card.ref,
      task: 'Match notes to cards.',
      apiKey: 'test-key',
    });

    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe('low');
  });

  test('drops matches whose ids the caller does not recognize', async ({ expect }) => {
    globalThis.fetch = mockAnthropic({
      content: [
        {
          text: JSON.stringify([
            { sourceId: 'n1', targetId: 'c1', confidence: 'high', reasoning: 'ok' },
            { sourceId: 'UNKNOWN', targetId: 'c1', confidence: 'high', reasoning: 'bogus' },
          ]),
        },
      ],
    }) as any;

    const results = await aiMatch<Note, Card>({
      source: notes,
      target: cards,
      summarizeSource: (note) => ({ title: note.title }),
      summarizeTarget: (card) => ({ name: card.name }),
      sourceId: (note) => note.id,
      targetId: (card) => card.ref,
      task: 'Match notes to cards.',
      apiKey: 'test-key',
    });

    expect(results).toHaveLength(1);
    expect(results[0].source.id).toBe('n1');
  });

  test('returns empty array when the model returns malformed JSON', async ({ expect }) => {
    globalThis.fetch = mockAnthropic({
      content: [{ text: 'not JSON at all' }],
    }) as any;

    const results = await aiMatch<Note, Card>({
      source: notes,
      target: cards,
      summarizeSource: (note) => ({ title: note.title }),
      summarizeTarget: (card) => ({ name: card.name }),
      sourceId: (note) => note.id,
      targetId: (card) => card.ref,
      task: 'Match notes to cards.',
      apiKey: 'test-key',
    });

    expect(results).toHaveLength(0);
  });

  test('short-circuits when either side is empty', async ({ expect }) => {
    const spy = vi.fn();
    globalThis.fetch = spy as any;

    const results = await aiMatch<Note, Card>({
      source: notes,
      target: [],
      summarizeSource: (note) => ({ title: note.title }),
      summarizeTarget: (card) => ({ name: card.name }),
      sourceId: (note) => note.id,
      targetId: (card) => card.ref,
      task: 'Match notes to cards.',
      apiKey: 'test-key',
    });

    expect(results).toHaveLength(0);
    expect(spy).not.toHaveBeenCalled();
  });

  test('throws with a helpful message when no API key is available', async ({ expect }) => {
    await expect(
      aiMatch<Note, Card>({
        source: notes,
        target: cards,
        summarizeSource: (note) => ({ title: note.title }),
        summarizeTarget: (card) => ({ name: card.name }),
        sourceId: (note) => note.id,
        targetId: (card) => card.ref,
        task: 'Match notes to cards.',
      }),
    ).rejects.toThrow(/no Anthropic API key/i);
  });

  test('surfaces non-OK API responses', async ({ expect }) => {
    globalThis.fetch = mockAnthropic({ error: 'rate limited' }, 429) as any;

    await expect(
      aiMatch<Note, Card>({
        source: notes,
        target: cards,
        summarizeSource: (note) => ({ title: note.title }),
        summarizeTarget: (card) => ({ name: card.name }),
        sourceId: (note) => note.id,
        targetId: (card) => card.ref,
        task: 'Match notes to cards.',
        apiKey: 'test-key',
      }),
    ).rejects.toThrow(/Anthropic API 429/);
  });
});
