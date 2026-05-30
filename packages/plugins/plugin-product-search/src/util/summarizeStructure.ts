//
// Copyright 2026 DXOS.org
//

import { type HTMLElement, parse } from 'node-html-parser';

export type SummarizeOptions = {
  // Max candidate selectors to emit.
  limit?: number;
  // Minimum repetitions for a selector to count as "repeating".
  minCount?: number;
};

// `advertCard-0` -> `advertCard-`, `carousel-image-12` -> `carousel-image-`, `foo_3` -> `foo_`.
// Returns undefined when the value has no trailing numeric index.
const stripIndex = (value: string): string | undefined => {
  const match = value.match(/^(.*?[-_])\d+$/);
  return match ? match[1] : undefined;
};

export type StructureCandidate = {
  selector: string;
  // Number of elements the selector matches.
  count: number;
  // How many `data-testid` fields the first match wraps (containers wrap many; leaf fields wrap 0).
  fields: number;
};

/**
 * Rank candidate repeating-container selectors in a listings page. Candidates are ranked by how
 * many fields they wrap (so the listing card outranks individual repeated fields like images),
 * then by repetition. Deterministic (stable sort). The basis for both the LLM-facing summary and
 * the runtime itemLocator self-heal.
 */
export const structureCandidates = (html: string, options: SummarizeOptions = {}): StructureCandidate[] => {
  const limit = options.limit ?? 15;
  const minCount = options.minCount ?? 3;

  let root: HTMLElement;
  try {
    root = parse(html);
  } catch {
    return [];
  }

  // selector -> { count, sample first-matching element }.
  const candidates = new Map<string, { count: number; sample: HTMLElement }>();
  const bump = (selector: string, element: HTMLElement) => {
    const entry = candidates.get(selector);
    if (entry) {
      entry.count += 1;
    } else {
      candidates.set(selector, { count: 1, sample: element });
    }
  };

  for (const element of root.querySelectorAll('*')) {
    const attributes = element.attributes;
    const testId = attributes['data-testid'];
    if (testId) {
      const prefix = stripIndex(testId);
      bump(prefix ? `[data-testid^="${prefix}"]` : `[data-testid="${testId}"]`, element);
    }
    // Other id-like data-* attributes often mark listing containers (e.g. data-advertid).
    for (const name of Object.keys(attributes)) {
      if (name !== 'data-testid' && name.startsWith('data-') && /id$/i.test(name)) {
        bump(`[${name}]`, element);
      }
    }
  }

  return (
    [...candidates.entries()]
      .filter(([, value]) => value.count >= minCount)
      .map(([selector, value]) => ({
        selector,
        count: value.count,
        fields: value.sample.querySelectorAll('[data-testid]').length,
      }))
      // Containers (wrap many fields) first, then by repetition, then stable by selector.
      .sort((a, b) => b.fields - a.fields || b.count - a.count || a.selector.localeCompare(b.selector))
      .slice(0, limit)
  );
};

/**
 * Render {@link structureCandidates} as a compact, ranked text block for the LLM — a far stronger
 * signal for authoring an `itemLocator` than a raw HTML dump (which is lossy after truncation and
 * easy to mis-generalize, e.g. `advertCard` vs the indexed `advertCard-0`).
 */
export const summarizeStructure = (html: string, options: SummarizeOptions = {}): string => {
  const ranked = structureCandidates(html, options);
  if (ranked.length === 0) {
    return '';
  }

  const lines = ranked.map(
    ({ selector, count, fields }) => `${selector}  ×${count}${fields > 0 ? ` (wraps ~${fields} fields)` : ''}`,
  );
  return [
    '## Repeating elements (candidate result-item containers and fields, by frequency)',
    '# The listing card repeats once per result and wraps the field elements; prefer it as itemLocator.',
    '# Use a `^=` prefix selector when container ids are indexed (e.g. advertCard-0, advertCard-1).',
    ...lines,
  ].join('\n');
};
