//
// Copyright 2026 DXOS.org
//

import { aiMatch } from '@dxos/ai-match';
import { log } from '@dxos/log';
import { type Granola } from '@dxos/plugin-granola/types';
import { type Markdown } from '@dxos/plugin-markdown/types';
import { type Trello } from '@dxos/plugin-trello/types';

export type CardMatch = {
  cardId: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  /** Which path produced this match — 'ai' when Claude returned it, 'heuristic' when the keyword fallback did. */
  source: 'ai' | 'heuristic';
};

export type MatchInput = {
  record: Granola.GranolaSyncRecord;
  document: Markdown.Document | undefined;
  cards: readonly Trello.TrelloCard[];
};

/**
 * Find Trello cards that relate to a Granola meeting note. Tries Claude first
 * via @dxos/ai-match; falls back to a simple keyword-overlap heuristic if the
 * API call fails (no key set, network down, demo is offline, etc.).
 *
 * The heuristic fallback is deliberately coarse — it exists so the demo still
 * shows *some* links in an offline setting. In normal operation the AI path
 * is expected to dominate.
 */
export const matchNoteToCards = async ({ record, document, cards }: MatchInput): Promise<CardMatch[]> => {
  const noteText = [
    document?.name ?? '',
    record.calendarEvent?.title ?? '',
    document?.content?.target?.content ?? '',
  ].join('\n');

  const activeCards = cards.filter((card) => !card.closed);
  if (activeCards.length === 0 || noteText.trim().length === 0) {
    return [];
  }

  try {
    const results = await aiMatch<Granola.GranolaSyncRecord, Trello.TrelloCard>({
      source: [record],
      target: activeCards,
      summarizeSource: () => ({
        title: document?.name ?? record.calendarEvent?.title ?? '',
        snippet: (document?.content?.target?.content ?? '').slice(0, 500),
        attendees: (record.attendees ?? []).map((attendee) => attendee.name ?? attendee.email ?? '').join(', '),
      }),
      summarizeTarget: (card) => ({
        name: card.name,
        list: card.listName ?? '',
        description: (card.description ?? '').slice(0, 200),
      }),
      sourceId: () => record.granolaId,
      targetId: (card) => card.id,
      task:
        'Matching meeting notes to Trello cards for a software engineering team. A match means the meeting discussed the feature, bug, or initiative the card tracks.',
    });

    return results.map((result) => ({
      cardId: result.target.id,
      confidence: (result.confidence ?? 'low') as 'high' | 'medium' | 'low',
      reasoning: result.reasoning,
      source: 'ai' as const,
    }));
  } catch (err) {
    log.info('demo: aiMatch failed, falling back to heuristic', { error: String(err) });
    return heuristicMatch(noteText, activeCards);
  }
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'was', 'were', 'are', 'have', 'has',
  'our', 'your', 'you', 'they', 'them', 'their', 'will', 'would', 'could', 'should',
]);

const tokenize = (text: string): Set<string> => {
  const tokens = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  return new Set(tokens.filter((token) => !STOPWORDS.has(token)));
};

/**
 * Bag-of-words overlap between a note's text and each card's name+description.
 * Not a match quality benchmark — just "something plausible" for the offline
 * demo path.
 */
const heuristicMatch = (noteText: string, cards: readonly Trello.TrelloCard[]): CardMatch[] => {
  const noteTokens = tokenize(noteText);
  const results: CardMatch[] = [];
  for (const card of cards) {
    const cardTokens = tokenize(`${card.name} ${card.description ?? ''}`);
    const shared = [...cardTokens].filter((token) => noteTokens.has(token));
    if (shared.length === 0) {
      continue;
    }
    const confidence: CardMatch['confidence'] = shared.length >= 3 ? 'high' : shared.length >= 2 ? 'medium' : 'low';
    if (confidence === 'low') {
      continue;
    }
    results.push({
      cardId: card.id,
      confidence,
      reasoning: `Shared keywords: ${shared.slice(0, 5).join(', ')}`,
      source: 'heuristic',
    });
  }
  return results;
};
