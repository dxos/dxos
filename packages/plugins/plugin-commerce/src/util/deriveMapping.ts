//
// Copyright 2026 DXOS.org
//

import { type HTMLElement, parse } from 'node-html-parser';

import { type FieldExtractor, type ResultMapping } from '../types/Provider';
import { structureCandidates } from './summarizeStructure';

/**
 * Derive a complete, working {@link ResultMapping} directly from a rendered listings page — the
 * deterministic fallback when an LLM-authored mapping extracts nothing. Walks the ranked repeating
 * containers and, for the first that yields a titled row, picks robust per-field selectors (title /
 * url / image) by probing the card's own DOM. Returns `undefined` if no titled container is found.
 */
export const deriveResultMapping = (html: string): ResultMapping | undefined => {
  let root: HTMLElement;
  try {
    root = parse(html);
  } catch {
    return undefined;
  }

  for (const candidate of structureCandidates(html).slice(0, 8)) {
    const items = root.querySelectorAll(candidate.selector);
    if (items.length === 0) {
      continue;
    }
    const first = items[0];

    // Title: prefer a child whose data-testid mentions "title", else a heading, else a non-empty link.
    const titled = first
      .querySelectorAll('[data-testid]')
      .find((element) => /title/i.test(element.getAttribute('data-testid') ?? '') && element.text.trim().length > 0);
    const anchor = first.querySelector('a');
    let titleSelector: string | undefined;
    if (titled) {
      titleSelector = `[data-testid="${titled.getAttribute('data-testid')}"]`;
    } else if (first.querySelector('h2')) {
      titleSelector = 'h2';
    } else if (first.querySelector('h3')) {
      titleSelector = 'h3';
    } else if (anchor && anchor.text.trim().length > 0) {
      titleSelector = 'a';
    }
    if (!titleSelector) {
      continue;
    }

    const fields: Record<string, FieldExtractor> = { title: { selector: titleSelector } };
    if (anchor) {
      fields.url = { selector: 'a', attr: 'href' };
    }
    if (first.querySelector('img')) {
      fields.image = { selector: 'img', attr: 'src' };
    }

    return { responseType: 'html', itemLocator: candidate.selector, fields };
  }

  return undefined;
};
