//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Task } from '@dxos/types';

import { ALL_STATUSES, parseStatusTerms, writeStatusTerms } from './status-terms.ts';

const without = (...hidden: Task.Status[]) => ALL_STATUSES.filter((status) => !hidden.includes(status));

describe('parseStatusTerms', () => {
  test('a query without status terms names no statuses', ({ expect }) => {
    expect(parseStatusTerms('roast #urgent')).to.deep.eq({ rest: 'roast #urgent' });
    expect(parseStatusTerms('')).to.deep.eq({ rest: '' });
  });

  test('a status term keeps that status', ({ expect }) => {
    expect(parseStatusTerms('status:started roast')).to.deep.eq({ statuses: ['started'], rest: 'roast' });
    expect(parseStatusTerms('roast status:"done"')).to.deep.eq({ statuses: ['done'], rest: 'roast' });
  });

  test('a negated status term hides that status', ({ expect }) => {
    expect(parseStatusTerms('NOT status:done not status:cancelled').statuses).to.deep.eq(without('done', 'cancelled'));
    expect(parseStatusTerms('!status:done').statuses).to.deep.eq(without('done'));
    expect(parseStatusTerms('! status:done').statuses).to.deep.eq(without('done'));
  });

  test('a group of alternatives keeps each of them', ({ expect }) => {
    expect(parseStatusTerms('(status:todo OR status:started) roast')).to.deep.eq({
      statuses: ['todo', 'started'],
      rest: 'roast',
    });
  });

  test('status terms intersect', ({ expect }) => {
    expect(parseStatusTerms('(status:todo OR status:done) NOT status:done').statuses).to.deep.eq(['todo']);
    expect(parseStatusTerms('status:todo status:done').statuses).to.deep.eq([]);
  });

  test('an unknown status stays in the text', ({ expect }) => {
    expect(parseStatusTerms('status:sta')).to.deep.eq({ rest: 'status:sta' });
    expect(parseStatusTerms('(status:todo OR title:x)')).to.deep.eq({ rest: '(status:todo OR title:x)' });
  });

  test('a top-level OR leaves the query whole', ({ expect }) => {
    expect(parseStatusTerms('status:done OR roast')).to.deep.eq({ rest: 'status:done OR roast' });
  });

  test('quoted text and apostrophes stay one term', ({ expect }) => {
    expect(parseStatusTerms('"status:done now" don\'t status:todo')).to.deep.eq({
      statuses: ['todo'],
      rest: '"status:done now" don\'t',
    });
  });
});

describe('writeStatusTerms', () => {
  test('every status writes no term', ({ expect }) => {
    expect(writeStatusTerms('NOT status:done roast', ALL_STATUSES)).to.eq('roast');
  });

  test('one status writes a single term, first', ({ expect }) => {
    expect(writeStatusTerms('roast', ['started'])).to.eq('status:started roast');
  });

  test('a few statuses write a group', ({ expect }) => {
    expect(writeStatusTerms('', ['todo', 'started'])).to.eq('(status:todo OR status:started)');
  });

  test('most statuses write the hidden ones', ({ expect }) => {
    expect(writeStatusTerms('roast', without('done', 'cancelled'))).to.eq('NOT status:done NOT status:cancelled roast');
  });

  test('no status writes every status hidden', ({ expect }) => {
    const text = writeStatusTerms('', []);
    expect(parseStatusTerms(text).statuses).to.deep.eq([]);
  });

  test('replaces the status terms already there and keeps the rest', ({ expect }) => {
    expect(writeStatusTerms('status:done #urgent roast', ['todo'])).to.eq('status:todo #urgent roast');
  });

  test('round-trips every subset through the text', ({ expect }) => {
    for (let mask = 0; mask < 1 << ALL_STATUSES.length; mask += 7) {
      const statuses = ALL_STATUSES.filter((_, index) => mask & (1 << index));
      const { statuses: parsed = ALL_STATUSES, rest } = parseStatusTerms(writeStatusTerms('roast', statuses));
      expect(parsed).to.deep.eq(statuses);
      expect(rest).to.eq('roast');
    }
  });
});
