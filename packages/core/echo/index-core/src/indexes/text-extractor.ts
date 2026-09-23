//
// Copyright 2026 DXOS.org
//

import type { Obj } from '@dxos/echo';
import { isEncodedReference } from '@dxos/echo-protocol';

/** Separator between extracted fragments; a trigram tokenizer never spans it. */
const SEPARATOR = '\n';

/**
 * Property names that carry an identifier rather than content, at any depth.
 * `@`-prefixed keys (`@type`, `@meta`, `@relationSource`, …) are excluded by prefix.
 */
const EXCLUDED_KEYS = new Set(['id']);

const isExcludedKey = (key: string): boolean => key.startsWith('@') || EXCLUDED_KEYS.has(key);

/**
 * Extracts the human-readable text of an object for the full-text index.
 *
 * Indexing the object's JSON made every property name part of the index, so a search for `title`
 * or `name` matched every object that merely had such a field — and a trigram index made that
 * worse, since any 3-character window of a key (`des` of `description`) matched too. Only string
 * values reach the index here: keys, numbers, booleans, identifiers and reference URIs are
 * dropped, because none of them is content a user searches for.
 */
export const extractIndexableText = (data: Obj.JSON): string => {
  const fragments: string[] = [];
  const visit = (value: unknown): void => {
    // A reference is `{ '/': 'dxn:…' }` — an identifier, and its target's text is indexed under
    // the target's own row.
    if (isEncodedReference(value)) {
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        fragments.push(trimmed);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, item] of Object.entries(value)) {
        if (!isExcludedKey(key)) {
          visit(item);
        }
      }
    }
  };
  visit(data);
  return fragments.join(SEPARATOR);
};
