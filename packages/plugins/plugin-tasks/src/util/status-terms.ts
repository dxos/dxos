//
// Copyright 2026 DXOS.org
//

import { Task } from '@dxos/types';

/** Every status the schema offers, in the order the schema lists them. */
export const ALL_STATUSES: readonly Task.Status[] = Task.StatusOptions.map(({ id }) => id);

const STATUS_SET: ReadonlySet<string> = new Set(ALL_STATUSES);
const NOT_KEYWORDS = new Set(['NOT', '!']);

export type StatusTerms = {
  /** The statuses the query's status terms keep; absent when the query names no status. */
  statuses?: readonly Task.Status[];
  /** The query with its status terms taken out. */
  rest: string;
};

/**
 * Splits the status terms out of a task query, so the status menu and the text are two views over
 * one string.
 *
 * Only top-level terms the menu itself could have written are read as status terms — `status:x`,
 * `NOT status:x` (or `!status:x`) and `(status:a OR status:b)` — and they are intersected, as the
 * query's implicit AND intersects them. A query with a top-level `OR` is left whole: its terms are not
 * all required, so no status set describes it. A value that is not a status (`status:sta` while it is
 * being typed) stays in the text, where it matches as the substring it is.
 */
export const parseStatusTerms = (text: string): StatusTerms => {
  const tokens = tokenize(text);
  if (tokens.some((token) => token.toUpperCase() === 'OR')) {
    return { rest: text.trim() };
  }

  let statuses: Set<Task.Status> | undefined;
  const narrow = (keep: (status: Task.Status) => boolean) => {
    statuses = new Set((statuses ? [...statuses] : ALL_STATUSES).filter(keep));
  };

  const rest: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const negated = NOT_KEYWORDS.has(token.toUpperCase()) && next !== undefined ? statusOf(next) : undefined;
    if (negated) {
      narrow((status) => status !== negated);
      index++;
      continue;
    }
    const inline = token.startsWith('!') ? statusOf(token.slice(1)) : undefined;
    if (inline) {
      narrow((status) => status !== inline);
      continue;
    }
    const single = statusOf(token);
    if (single) {
      narrow((status) => status === single);
      continue;
    }
    const group = statusGroup(token);
    if (group) {
      narrow((status) => group.has(status));
      continue;
    }
    rest.push(token);
  }

  const kept: ReadonlySet<Task.Status> | undefined = statuses;
  return kept
    ? { statuses: ALL_STATUSES.filter((status) => kept.has(status)), rest: rest.join(' ') }
    : { rest: rest.join(' ') };
};

/**
 * The query with its status terms replaced by the one term that says `statuses`, placed first.
 *
 * Written in whichever of the two forms is shorter — the statuses kept (`status:a`,
 * `(status:a OR status:b)`) or the statuses hidden (`NOT status:x NOT status:y`) — so hiding the two
 * finished statuses reads as that, not as a list of the seven left. Every status writes no term.
 */
export const writeStatusTerms = (text: string, statuses: readonly Task.Status[]): string => {
  const { rest } = parseStatusTerms(text);
  const kept = ALL_STATUSES.filter((status) => statuses.includes(status));
  const hidden = ALL_STATUSES.filter((status) => !statuses.includes(status));
  const term =
    hidden.length === 0
      ? ''
      : kept.length > 0 && kept.length <= hidden.length
        ? kept.length === 1
          ? `status:${kept[0]}`
          : `(${kept.map((status) => `status:${status}`).join(' OR ')})`
        : hidden.map((status) => `NOT status:${status}`).join(' ');

  return [term, rest].filter((part) => part.length > 0).join(' ');
};

/** `status:x` (the value optionally quoted) for a known status, else undefined. */
const statusOf = (token: string): Task.Status | undefined => {
  const match = /^status:(["']?)([a-z]+)\1$/i.exec(token);
  const value = match?.[2].toLowerCase();
  return value && STATUS_SET.has(value) ? (value as Task.Status) : undefined;
};

/** `(status:a OR status:b …)` — every alternative a known status — else undefined. */
const statusGroup = (token: string): ReadonlySet<Task.Status> | undefined => {
  if (!token.startsWith('(') || !token.endsWith(')')) {
    return undefined;
  }
  const parts = token.slice(1, -1).trim().split(/\s+/);
  const statuses = new Set<Task.Status>();
  for (let index = 0; index < parts.length; index++) {
    if (index % 2 === 1) {
      if (parts[index].toUpperCase() !== 'OR') {
        return undefined;
      }
      continue;
    }
    const status = statusOf(parts[index]);
    if (!status) {
      return undefined;
    }
    statuses.add(status);
  }
  return parts.length % 2 === 1 ? statuses : undefined;
};

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
    // An apostrophe inside a word (`don't`) is not a quote, as the query parser reads it.
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
