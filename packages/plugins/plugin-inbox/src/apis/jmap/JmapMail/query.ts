//
// Copyright 2026 DXOS.org
//

import { subDays, subMonths, subWeeks, subYears } from 'date-fns';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { type Filter, type FilterCondition, type FilterOperator } from '../Jmap';
import { type Mailbox } from './types';

/** Context for {@link parseMailQuery}: a clock (for relative dates) and a label/folder resolver. */
export type ParseContext = {
  readonly now: Date;
  /** Resolves a `label:`/`in:` name or system role to a JMAP mailbox id. */
  readonly resolveMailbox: (nameOrRole: string) => Option.Option<string>;
};

type Token =
  | { readonly _tag: 'or' }
  | { readonly _tag: 'term'; readonly negate: boolean; readonly op: Option.Option<string>; readonly value: string };

/**
 * Translates a Gmail-like query string into a JMAP `Email/query` filter (RFC 8621 §4.4.1).
 *
 * Supported operators: `from:`/`to:`/`cc:`/`bcc:`/`subject:`/`body:`, `label:`/`in:` (resolved to a
 * mailbox id), `is:unread|read|starred|flagged|unstarred|draft|answered`, `has:attachment`,
 * `after:`/`before:` (`YYYY/MM/DD` or `YYYY-MM-DD`), `newer_than:`/`older_than:` (e.g. `7d`, `2w`,
 * `3m`, `1y`), `larger:`/`smaller:` (e.g. `10M`, `500k`), `list:`/`deliveredto:` (header match),
 * quoted phrases, `-` negation, `OR` groups, and bare words (full-text). Space-separated terms are
 * AND-ed. Returns `None` for an empty query, or one whose terms all fail to resolve (e.g. an unknown
 * label).
 */
export const parseMailQuery = (query: string, ctx: ParseContext): Option.Option<Filter> =>
  buildFilter(tokenize(query), ctx);

/** Resolves a label/folder name (case-insensitive) or a system role/alias to a mailbox id. */
export const resolveMailboxByNameOrRole = (folders: readonly Mailbox[], nameOrRole: string): Option.Option<string> => {
  const lowered = nameOrRole.toLowerCase();
  const role = ROLE_ALIASES[lowered] ?? lowered;
  const match =
    folders.find((folder) => folder.role === role) ?? folders.find((folder) => folder.name.toLowerCase() === lowered);
  return Option.fromNullable(match?.id);
};

//
// Tokenizer.
//

// A token is an optional `-`, optional `op:` prefix, then a `"quoted"` value or a non-space run.
const TOKEN_RE = /-?(?:[A-Za-z_]+:)?"[^"]*"|\S+/g;

const tokenize = (query: string): readonly Token[] => (query.match(TOKEN_RE) ?? []).map(parseToken);

const parseToken = (raw: string): Token => {
  if (raw === 'OR') {
    return { _tag: 'or' };
  }
  const negate = raw.startsWith('-');
  const rest = negate ? raw.slice(1) : raw;
  const colon = rest.indexOf(':');
  if (colon > 0 && /^[A-Za-z_]+$/.test(rest.slice(0, colon))) {
    return {
      _tag: 'term',
      negate,
      op: Option.some(rest.slice(0, colon).toLowerCase()),
      value: stripQuotes(rest.slice(colon + 1)),
    };
  }
  return { _tag: 'term', negate, op: Option.none(), value: stripQuotes(rest) };
};

const stripQuotes = (value: string): string =>
  value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;

//
// Folding tokens into a filter tree. Space-separated terms AND together; an `OR` token merges the
// next term with the previous operand. Terms that resolve to `None` (unknown label, empty value) are
// dropped.
//

const buildFilter = (tokens: readonly Token[], ctx: ParseContext): Option.Option<Filter> => {
  const { operands } = tokens.reduce<{ operands: readonly Filter[]; pendingOr: boolean }>(
    (state, token) => {
      if (token._tag === 'or') {
        return { ...state, pendingOr: state.operands.length > 0 };
      }
      const leaf = buildTerm(token, ctx);
      if (Option.isNone(leaf)) {
        // A dropped term (unknown label, empty value) consumes any pending OR: the next valid term
        // must not merge with the previous operand unless its own `or` token immediately precedes it.
        return { ...state, pendingOr: false };
      }
      const previous = state.pendingOr ? state.operands[state.operands.length - 1] : undefined;
      return previous !== undefined
        ? { operands: [...state.operands.slice(0, -1), mergeOr(previous, leaf.value)], pendingOr: false }
        : { operands: [...state.operands, leaf.value], pendingOr: false };
    },
    { operands: [], pendingOr: false },
  );

  return Match.value(operands.length).pipe(
    Match.when(0, () => Option.none<Filter>()),
    Match.when(1, () => Option.fromNullable(operands[0])),
    Match.orElse(() => Option.some<Filter>({ operator: 'AND', conditions: operands })),
  );
};

const mergeOr = (previous: Filter, next: Filter): FilterOperator =>
  isOperator(previous) && previous.operator === 'OR'
    ? { operator: 'OR', conditions: [...previous.conditions, next] }
    : { operator: 'OR', conditions: [previous, next] };

const isOperator = (filter: Filter): filter is FilterOperator => 'operator' in filter;

/** Whether a filter restricts the mailbox scope (`inMailbox`/`inMailboxOtherThan`), recursively. */
export const filterScopesMailbox = (filter: Filter): boolean =>
  isOperator(filter)
    ? filter.conditions.some(filterScopesMailbox)
    : filter.inMailbox !== undefined || filter.inMailboxOtherThan !== undefined;

const buildTerm = (token: Extract<Token, { _tag: 'term' }>, ctx: ParseContext): Option.Option<Filter> =>
  buildLeaf(token.op, token.value, ctx).pipe(Option.map((leaf) => (token.negate ? negate(leaf) : leaf)));

const negate = (filter: Filter): FilterOperator => ({ operator: 'NOT', conditions: [filter] });

//
// Leaf construction (operator → JMAP FilterCondition).
//

const buildLeaf = (op: Option.Option<string>, value: string, ctx: ParseContext): Option.Option<Filter> =>
  op.pipe(
    Option.match({
      onNone: () => textLeaf(value),
      onSome: (operator) => buildOperatorLeaf(operator, value, ctx),
    }),
  );

const buildOperatorLeaf = (operator: string, value: string, ctx: ParseContext): Option.Option<Filter> =>
  Match.value(operator).pipe(
    Match.whenOr('from', 'to', 'cc', 'bcc', 'subject', 'body', (field) =>
      condLeaf(value, STRING_FIELD_LEAVES[field](value)),
    ),
    Match.whenOr('label', 'in', () => ctx.resolveMailbox(value).pipe(Option.map((id) => ({ inMailbox: id })))),
    Match.when('is', () => Option.fromNullable(IS_LEAVES[value.toLowerCase()])),
    Match.when('has', () =>
      value.toLowerCase() === 'attachment' ? Option.some<Filter>({ hasAttachment: true }) : Option.none<Filter>(),
    ),
    Match.whenOr('after', 'newer', () => dateLeaf(value, 'after')),
    Match.whenOr('before', 'older', () => dateLeaf(value, 'before')),
    Match.when('newer_than', () => relativeDateLeaf(value, ctx.now, 'after')),
    Match.when('older_than', () => relativeDateLeaf(value, ctx.now, 'before')),
    Match.when('larger', () => sizeLeaf(value, 'minSize')),
    Match.when('smaller', () => sizeLeaf(value, 'maxSize')),
    Match.when('list', () => headerLeaf('List-Id', value)),
    Match.when('deliveredto', () => headerLeaf('Delivered-To', value)),
    // Unknown operator: keep the literal `op:value` as a full-text term (mirrors Gmail's fallback).
    Match.orElse(() => textLeaf(`${operator}:${value}`)),
  );

type StringField = 'from' | 'to' | 'cc' | 'bcc' | 'subject' | 'body';

const STRING_FIELD_LEAVES: Record<StringField, (value: string) => FilterCondition> = {
  from: (value) => ({ from: value }),
  to: (value) => ({ to: value }),
  cc: (value) => ({ cc: value }),
  bcc: (value) => ({ bcc: value }),
  subject: (value) => ({ subject: value }),
  body: (value) => ({ body: value }),
};

const IS_LEAVES: Record<string, Filter> = {
  unread: { notKeyword: '$seen' },
  read: { hasKeyword: '$seen' },
  starred: { hasKeyword: '$flagged' },
  flagged: { hasKeyword: '$flagged' },
  unstarred: { notKeyword: '$flagged' },
  unflagged: { notKeyword: '$flagged' },
  draft: { hasKeyword: '$draft' },
  answered: { hasKeyword: '$answered' },
  replied: { hasKeyword: '$answered' },
};

const ROLE_ALIASES: Record<string, string> = { spam: 'junk', bin: 'trash', deleted: 'trash' };

const SIZE_UNITS: Record<string, number> = { '': 1, 'k': 1024, 'm': 1024 * 1024, 'g': 1024 * 1024 * 1024 };
const DATE_RE = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
const RELATIVE_RE = /^(\d+)([dwmy])$/;
const SIZE_RE = /^(\d+)([kmg]?)b?$/i;

/** Wraps a built condition in `Some`, or `None` when the value is blank. */
const condLeaf = (value: string, condition: Filter): Option.Option<Filter> =>
  value.trim().length === 0 ? Option.none() : Option.some(condition);

const textLeaf = (value: string): Option.Option<Filter> => condLeaf(value, { text: value });

const headerLeaf = (name: string, value: string): Option.Option<Filter> => condLeaf(value, { header: [name, value] });

const dateLeaf = (value: string, bound: 'after' | 'before'): Option.Option<Filter> => {
  const match = DATE_RE.exec(value);
  if (!match) {
    return Option.none();
  }
  const iso = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).toISOString();
  return Option.some(bound === 'after' ? { after: iso } : { before: iso });
};

const relativeDateLeaf = (value: string, now: Date, bound: 'after' | 'before'): Option.Option<Filter> => {
  const match = RELATIVE_RE.exec(value.toLowerCase());
  if (!match) {
    return Option.none();
  }
  const amount = Number(match[1]);
  const date = Match.value(match[2]).pipe(
    Match.when('w', () => subWeeks(now, amount)),
    Match.when('m', () => subMonths(now, amount)),
    Match.when('y', () => subYears(now, amount)),
    Match.orElse(() => subDays(now, amount)),
  );
  const iso = date.toISOString();
  return Option.some(bound === 'after' ? { after: iso } : { before: iso });
};

const sizeLeaf = (value: string, bound: 'minSize' | 'maxSize'): Option.Option<Filter> => {
  const match = SIZE_RE.exec(value.toLowerCase());
  if (!match) {
    return Option.none();
  }
  const bytes = Number(match[1]) * (SIZE_UNITS[match[2] ?? ''] ?? 1);
  return Option.some(bound === 'minSize' ? { minSize: bytes } : { maxSize: bytes });
};
