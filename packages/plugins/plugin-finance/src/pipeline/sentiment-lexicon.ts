//
// Copyright 2026 DXOS.org
//

/** A sentiment label. */
export type Polarity = 'positive' | 'negative' | 'neutral';

/** A sentiment: its label and a score in [-1, 1]. */
export type Sentiment = { readonly polarity: Polarity; readonly score: number };

// Stems of headline verbs and nouns that move a stock; a word matches a stem it starts with.
const POSITIVE = [
  'surg',
  'soar',
  'jump',
  'rall',
  'gain',
  'climb',
  'rise',
  'rose',
  'beat',
  'tops',
  'upgrad',
  'outperform',
  'bullish',
  'record',
  'boost',
  'raise',
  'raising',
  'strong',
  'growth',
  'profit',
  'rebound',
  'recover',
  'win',
  'wins',
  'approv',
  'buy',
  'higher',
  'up',
  'best',
  'optimis',
];
const NEGATIVE = [
  'plung',
  'tumbl',
  'slump',
  'sink',
  'sank',
  'fall',
  'fell',
  'drop',
  'slid',
  'slide',
  'declin',
  'miss',
  'downgrad',
  'underperform',
  'bearish',
  'cut',
  'cuts',
  'weak',
  'loss',
  'losses',
  'lawsuit',
  'sued',
  'probe',
  'investigat',
  'recall',
  'layoff',
  'warn',
  'crash',
  'sell-off',
  'selloff',
  'fear',
  'risk',
  'lower',
  'down',
  'worst',
  'concern',
  'tariff',
];
const NEGATORS = new Set(['no', 'not', "doesn't", "didn't", 'never', 'fails', 'without']);

const matches = (word: string, stems: readonly string[]): boolean =>
  stems.some((stem) => (stem.length <= 4 ? word === stem || word === `${stem}s` : word.startsWith(stem)));

/**
 * A deterministic headline sentiment baseline: counts positive and negative stems (a negator flips the next word)
 * and scores their balance. Cheap and transparent, it is what the model's sentiment is compared against.
 */
export const lexiconSentiment = (text: string): Sentiment => {
  const words = text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
  let positive = 0;
  let negative = 0;
  words.forEach((word, index) => {
    const sign = matches(word, POSITIVE) ? 1 : matches(word, NEGATIVE) ? -1 : 0;
    const signed = index > 0 && NEGATORS.has(words[index - 1]) ? -sign : sign;
    if (signed > 0) {
      positive++;
    } else if (signed < 0) {
      negative++;
    }
  });
  const total = positive + negative;
  if (total === 0) {
    return { polarity: 'neutral', score: 0 };
  }
  const score = Math.round(((positive - negative) / total) * Math.min(1, total / 2) * 100) / 100;
  return { polarity: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral', score };
};

/** The label a score falls under, with the same thresholds as {@link lexiconSentiment}. */
export const polarityOf = (score: number): Polarity =>
  score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
