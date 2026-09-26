//
// Copyright 2026 DXOS.org
//

/** A property that takes one of a closed set of values — a task's `status`, a message's `folder`. */
export type EnumProperty<T extends string> = {
  /** The property name as a term writes it (`status` in `status:done`). */
  property: string;
  /** Every value, in the order a written term lists them. */
  values: readonly T[];
};

export type EnumTerms<T extends string> = {
  /** The values the query's terms on the property keep; absent when the query names none. */
  values?: readonly T[];
  /** The query with those terms taken out. */
  rest: string;
};

const NOT_KEYWORDS = new Set(['NOT', '!']);

/**
 * Splits the terms on one enumerated property out of a query, so a picker for that property and the
 * query text can be two views over one string.
 *
 * Only top-level terms a picker could have written are read — `prop:x`, `NOT prop:x` (or `!prop:x`)
 * and `(prop:a OR prop:b)` — and they are intersected, as the query's implicit AND intersects them.
 * A query with a top-level `OR` is left whole: its terms are not all required, so no value set
 * describes it. A value outside the set (`status:sta` while it is being typed) stays in the text,
 * where it matches as the substring it is.
 */
export const parseEnumTerms = <T extends string>(text: string, { property, values }: EnumProperty<T>): EnumTerms<T> => {
  const tokens = tokenize(text);
  if (hasTopLevelOr(tokens)) {
    return { rest: text.trim() };
  }

  const valueOf = (token: string): T | undefined => {
    const match = termPattern(property).exec(token);
    const value = match?.[2].toLowerCase();
    return value === undefined ? undefined : values.find((candidate) => candidate.toLowerCase() === value);
  };
  const groupOf = (token: string): ReadonlySet<T> | undefined => {
    if (!token.startsWith('(') || !token.endsWith(')')) {
      return undefined;
    }
    const parts = token.slice(1, -1).trim().split(/\s+/);
    const group = new Set<T>();
    for (let index = 0; index < parts.length; index++) {
      if (index % 2 === 1) {
        if (parts[index].toUpperCase() !== 'OR') {
          return undefined;
        }
        continue;
      }
      const value = valueOf(parts[index]);
      if (value === undefined) {
        return undefined;
      }
      group.add(value);
    }
    return parts.length % 2 === 1 ? group : undefined;
  };

  let kept: Set<T> | undefined;
  const narrow = (keep: (value: T) => boolean) => {
    kept = new Set((kept ? [...kept] : values).filter(keep));
  };

  const rest: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const negated = NOT_KEYWORDS.has(token.toUpperCase()) && next !== undefined ? valueOf(next) : undefined;
    if (negated !== undefined) {
      narrow((value) => value !== negated);
      index++;
      continue;
    }
    const inline = token.startsWith('!') ? valueOf(token.slice(1)) : undefined;
    if (inline !== undefined) {
      narrow((value) => value !== inline);
      continue;
    }
    const single = valueOf(token);
    if (single !== undefined) {
      narrow((value) => value === single);
      continue;
    }
    const group = groupOf(token);
    if (group) {
      narrow((value) => group.has(value));
      continue;
    }
    rest.push(token);
  }

  const result: ReadonlySet<T> | undefined = kept;
  return result
    ? { values: values.filter((value) => result.has(value)), rest: rest.join(' ') }
    : { rest: rest.join(' ') };
};

/**
 * The query with its terms on the property replaced by the one term that says `selected`, placed
 * first.
 *
 * Written in whichever of the two forms is shorter — the values kept (`prop:a`, `(prop:a OR prop:b)`)
 * or the values hidden (`NOT prop:x NOT prop:y`) — so hiding two of nine reads as that, not as a list
 * of the seven left. Every value selected writes no term. A query with a top-level `OR` comes back
 * unchanged: no term on the property describes it, so a written term could not be read back, and
 * each write would stack another term in front of the last.
 */
export const writeEnumTerms = <T extends string>(
  text: string,
  spec: EnumProperty<T>,
  selected: readonly T[],
): string => {
  const { property, values } = spec;
  if (hasTopLevelOr(tokenize(text))) {
    return text;
  }
  const { rest } = parseEnumTerms(text, spec);
  const kept = values.filter((value) => selected.includes(value));
  const hidden = values.filter((value) => !selected.includes(value));
  const term =
    hidden.length === 0
      ? ''
      : kept.length > 0 && kept.length <= hidden.length
        ? kept.length === 1
          ? `${property}:${kept[0]}`
          : `(${kept.map((value) => `${property}:${value}`).join(' OR ')})`
        : hidden.map((value) => `NOT ${property}:${value}`).join(' ');

  return [term, rest].filter((part) => part.length > 0).join(' ');
};

const hasTopLevelOr = (tokens: readonly string[]): boolean => tokens.some((token) => token.toUpperCase() === 'OR');

/** `prop:value`, the value optionally quoted; the property name matched literally, in any case. */
const termPattern = (property: string): RegExp =>
  new RegExp(`^${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(["']?)([\\w-]+)\\1$`, 'i');

/** Top-level terms: whitespace-separated, with parenthesized groups and quoted strings kept whole. */
const tokenize = (text: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | undefined;
  let previous = '';
  for (const char of text) {
    const prior = previous;
    previous = char;
    if (quote) {
      current += char;
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }
    // An apostrophe inside a word (`don't`) is not a quote, as `normalizeInput` reads it.
    if (char === '"' || (char === "'" && !/[a-zA-Z0-9_]/.test(prior))) {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (/\s/.test(char) && depth === 0) {
      if (current.length > 0) {
        tokens.push(current);
      }
      current = '';
      continue;
    }
    current += char;
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
};
