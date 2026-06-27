//
// Copyright 2026 DXOS.org
//

import { subDays, subMonths, subWeeks, subYears } from 'date-fns';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { Jmap, JmapMail } from '../index';
import { filterScopesMailbox, parseMailQuery, resolveMailboxByNameOrRole } from './query';

const FOLDERS: JmapMail.Mailbox[] = [
  { id: 'mb-inbox', name: 'Inbox', role: 'inbox' },
  { id: 'mb-sent', name: 'Sent', role: 'sent' },
  { id: 'mb-junk', name: 'Spam', role: 'junk' },
  { id: 'mb-school', name: 'School', role: null },
];

const NOW = new Date('2026-06-15T00:00:00.000Z');

const ctx = { now: NOW, resolveMailbox: (nameOrRole: string) => resolveMailboxByNameOrRole(FOLDERS, nameOrRole) };

// Returns the parsed filter, or `null` when the query yields no filter.
const parse = (query: string): Jmap.Filter | null => Option.getOrNull(parseMailQuery(query, ctx));

describe('parseMailQuery', () => {
  test('empty / whitespace yields no filter', ({ expect }) => {
    expect(parse('')).toBeNull();
    expect(parse('   ')).toBeNull();
  });

  test('bare words become full-text conditions, AND-ed', ({ expect }) => {
    expect(parse('hello')).toEqual({ text: 'hello' });
    expect(parse('hello world')).toEqual({ operator: 'AND', conditions: [{ text: 'hello' }, { text: 'world' }] });
  });

  test('quoted phrases stay intact', ({ expect }) => {
    expect(parse('"hello world"')).toEqual({ text: 'hello world' });
    expect(parse('subject:"hello world"')).toEqual({ subject: 'hello world' });
  });

  test('address and subject/body operators', ({ expect }) => {
    expect(parse('from:alice@x.com')).toEqual({ from: 'alice@x.com' });
    expect(parse('to:bob@x.com')).toEqual({ to: 'bob@x.com' });
    expect(parse('cc:carol@x.com')).toEqual({ cc: 'carol@x.com' });
    expect(parse('bcc:dan@x.com')).toEqual({ bcc: 'dan@x.com' });
    expect(parse('subject:invoice')).toEqual({ subject: 'invoice' });
    expect(parse('body:receipt')).toEqual({ body: 'receipt' });
  });

  test('label / in resolve to a mailbox id (by name or role/alias)', ({ expect }) => {
    expect(parse('label:School')).toEqual({ inMailbox: 'mb-school' });
    expect(parse('label:school')).toEqual({ inMailbox: 'mb-school' });
    expect(parse('in:inbox')).toEqual({ inMailbox: 'mb-inbox' });
    expect(parse('in:spam')).toEqual({ inMailbox: 'mb-junk' });
  });

  test('an unknown label drops the term (and yields no filter when alone)', ({ expect }) => {
    expect(parse('label:Nonexistent')).toBeNull();
    expect(parse('label:Nonexistent subject:hi')).toEqual({ subject: 'hi' });
  });

  test('is: maps to keyword conditions', ({ expect }) => {
    expect(parse('is:unread')).toEqual({ notKeyword: '$seen' });
    expect(parse('is:read')).toEqual({ hasKeyword: '$seen' });
    expect(parse('is:starred')).toEqual({ hasKeyword: '$flagged' });
    expect(parse('is:draft')).toEqual({ hasKeyword: '$draft' });
    expect(parse('is:bogus')).toBeNull();
  });

  test('has:attachment', ({ expect }) => {
    expect(parse('has:attachment')).toEqual({ hasAttachment: true });
    expect(parse('has:nope')).toBeNull();
  });

  test('absolute dates (slash or dash) become UTC before/after', ({ expect }) => {
    expect(parse('after:2024/01/01')).toEqual({ after: '2024-01-01T00:00:00.000Z' });
    expect(parse('before:2024-12-31')).toEqual({ before: '2024-12-31T00:00:00.000Z' });
    expect(parse('newer:2024/06/01')).toEqual({ after: '2024-06-01T00:00:00.000Z' });
    expect(parse('after:not-a-date')).toBeNull();
  });

  test('relative dates compute from `now`', ({ expect }) => {
    expect(parse('newer_than:7d')).toEqual({ after: subDays(NOW, 7).toISOString() });
    expect(parse('newer_than:2w')).toEqual({ after: subWeeks(NOW, 2).toISOString() });
    expect(parse('older_than:3m')).toEqual({ before: subMonths(NOW, 3).toISOString() });
    expect(parse('older_than:1y')).toEqual({ before: subYears(NOW, 1).toISOString() });
  });

  test('size operators parse units', ({ expect }) => {
    expect(parse('larger:10M')).toEqual({ minSize: 10 * 1024 * 1024 });
    expect(parse('smaller:500k')).toEqual({ maxSize: 500 * 1024 });
    expect(parse('larger:2048')).toEqual({ minSize: 2048 });
  });

  test('list / deliveredto map to header conditions', ({ expect }) => {
    expect(parse('list:dev.example.com')).toEqual({ header: ['List-Id', 'dev.example.com'] });
    expect(parse('deliveredto:me@x.com')).toEqual({ header: ['Delivered-To', 'me@x.com'] });
  });

  test('negation wraps a term in NOT', ({ expect }) => {
    expect(parse('-from:noreply@x.com')).toEqual({ operator: 'NOT', conditions: [{ from: 'noreply@x.com' }] });
  });

  test('OR groups adjacent terms', ({ expect }) => {
    expect(parse('from:a@x.com OR from:b@x.com')).toEqual({
      operator: 'OR',
      conditions: [{ from: 'a@x.com' }, { from: 'b@x.com' }],
    });
  });

  test('consecutive ORs flatten into a single OR', ({ expect }) => {
    expect(parse('a OR b OR c')).toEqual({
      operator: 'OR',
      conditions: [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
    });
  });

  test('OR binds tighter than the implicit AND chain', ({ expect }) => {
    expect(parse('from:a OR from:b subject:c')).toEqual({
      operator: 'AND',
      conditions: [{ operator: 'OR', conditions: [{ from: 'a' }, { from: 'b' }] }, { subject: 'c' }],
    });
  });

  test('a realistic combined query', ({ expect }) => {
    expect(parse('label:School is:unread newer_than:14d -from:noreply@x.com')).toEqual({
      operator: 'AND',
      conditions: [
        { inMailbox: 'mb-school' },
        { notKeyword: '$seen' },
        { after: subDays(NOW, 14).toISOString() },
        { operator: 'NOT', conditions: [{ from: 'noreply@x.com' }] },
      ],
    });
  });

  test('an unknown operator falls back to a literal full-text term', ({ expect }) => {
    expect(parse('foo:bar')).toEqual({ text: 'foo:bar' });
  });
});

describe('resolveMailboxByNameOrRole', () => {
  test('resolves by case-insensitive name', ({ expect }) => {
    expect(Option.getOrNull(resolveMailboxByNameOrRole(FOLDERS, 'school'))).toBe('mb-school');
    expect(Option.getOrNull(resolveMailboxByNameOrRole(FOLDERS, 'SCHOOL'))).toBe('mb-school');
  });

  test('resolves by role and alias', ({ expect }) => {
    expect(Option.getOrNull(resolveMailboxByNameOrRole(FOLDERS, 'inbox'))).toBe('mb-inbox');
    expect(Option.getOrNull(resolveMailboxByNameOrRole(FOLDERS, 'spam'))).toBe('mb-junk');
  });

  test('returns None for an unknown name', ({ expect }) => {
    expect(Option.getOrNull(resolveMailboxByNameOrRole(FOLDERS, 'nope'))).toBeNull();
  });
});

describe('filterScopesMailbox', () => {
  test('true when any condition restricts the mailbox', ({ expect }) => {
    expect(filterScopesMailbox({ inMailbox: 'mb-school' })).toBe(true);
    expect(filterScopesMailbox({ inMailboxOtherThan: ['mb-junk'] })).toBe(true);
    expect(filterScopesMailbox({ operator: 'AND', conditions: [{ from: 'a' }, { inMailbox: 'x' }] })).toBe(true);
  });

  test('false when no condition restricts the mailbox', ({ expect }) => {
    expect(filterScopesMailbox({ from: 'a@x.com' })).toBe(false);
    expect(filterScopesMailbox({ operator: 'OR', conditions: [{ notKeyword: '$seen' }, { subject: 'x' }] })).toBe(
      false,
    );
  });
});
