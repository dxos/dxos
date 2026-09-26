//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type EnumProperty, parseEnumTerms, writeEnumTerms } from './enum-terms.ts';

const STATUSES = [
  'todo',
  'backlog',
  'started',
  'review',
  'done',
  'duplicate',
  'blocked',
  'cancelled',
  'failed',
] as const;
type Status = (typeof STATUSES)[number];
const status: EnumProperty<Status> = { property: 'status', values: STATUSES };

const without = (...hidden: Status[]) => STATUSES.filter((value) => !hidden.includes(value));

describe('parseEnumTerms', () => {
  test('a query without terms on the property names no values', ({ expect }) => {
    expect(parseEnumTerms('roast #urgent', status)).to.deep.eq({ rest: 'roast #urgent' });
    expect(parseEnumTerms('', status)).to.deep.eq({ rest: '' });
  });

  test('a term keeps that value', ({ expect }) => {
    expect(parseEnumTerms('status:started roast', status)).to.deep.eq({ values: ['started'], rest: 'roast' });
    expect(parseEnumTerms('roast status:"done"', status)).to.deep.eq({ values: ['done'], rest: 'roast' });
    expect(parseEnumTerms("status:'done'", status).values).to.deep.eq(['done']);
  });

  test('the property and value ignore case', ({ expect }) => {
    expect(parseEnumTerms('Status:DONE', status).values).to.deep.eq(['done']);
  });

  test('a negated term hides that value', ({ expect }) => {
    expect(parseEnumTerms('NOT status:done not status:cancelled', status).values).to.deep.eq(
      without('done', 'cancelled'),
    );
    expect(parseEnumTerms('!status:done', status).values).to.deep.eq(without('done'));
    expect(parseEnumTerms('! status:done', status).values).to.deep.eq(without('done'));
  });

  test('a group of alternatives keeps each of them', ({ expect }) => {
    expect(parseEnumTerms('(status:todo OR status:started) roast', status)).to.deep.eq({
      values: ['todo', 'started'],
      rest: 'roast',
    });
  });

  test('terms intersect', ({ expect }) => {
    expect(parseEnumTerms('(status:todo OR status:done) NOT status:done', status).values).to.deep.eq(['todo']);
    expect(parseEnumTerms('status:todo status:done', status).values).to.deep.eq([]);
  });

  test('values come back in the property order, not the query order', ({ expect }) => {
    expect(parseEnumTerms('(status:done OR status:todo)', status).values).to.deep.eq(['todo', 'done']);
  });

  test('a value outside the set stays in the text', ({ expect }) => {
    expect(parseEnumTerms('status:sta', status)).to.deep.eq({ rest: 'status:sta' });
    expect(parseEnumTerms('(status:todo OR title:x)', status)).to.deep.eq({ rest: '(status:todo OR title:x)' });
  });

  test('terms on another property stay in the text', ({ expect }) => {
    expect(parseEnumTerms('priority:high status:done', status)).to.deep.eq({
      values: ['done'],
      rest: 'priority:high',
    });
    expect(parseEnumTerms('statuses:done', status)).to.deep.eq({ rest: 'statuses:done' });
  });

  test('a top-level OR leaves the query whole', ({ expect }) => {
    expect(parseEnumTerms('status:done OR roast', status)).to.deep.eq({ rest: 'status:done OR roast' });
  });

  test('quoted text and apostrophes stay one term', ({ expect }) => {
    expect(parseEnumTerms('"status:done now" don\'t status:todo', status)).to.deep.eq({
      values: ['todo'],
      rest: '"status:done now" don\'t',
    });
  });

  test('hyphenated values and dotted properties parse', ({ expect }) => {
    const state: EnumProperty<'in-progress' | 'closed'> = {
      property: 'meta.state',
      values: ['in-progress', 'closed'],
    };
    expect(parseEnumTerms('meta.state:in-progress', state).values).to.deep.eq(['in-progress']);
    expect(parseEnumTerms('metaXstate:in-progress', state)).to.deep.eq({ rest: 'metaXstate:in-progress' });
  });
});

describe('writeEnumTerms', () => {
  test('every value selected writes no term', ({ expect }) => {
    expect(writeEnumTerms('NOT status:done roast', status, STATUSES)).to.eq('roast');
  });

  test('one value writes a single term, first', ({ expect }) => {
    expect(writeEnumTerms('roast', status, ['started'])).to.eq('status:started roast');
  });

  test('a few values write a group', ({ expect }) => {
    expect(writeEnumTerms('', status, ['todo', 'started'])).to.eq('(status:todo OR status:started)');
  });

  test('most values write the hidden ones', ({ expect }) => {
    expect(writeEnumTerms('roast', status, without('done', 'cancelled'))).to.eq(
      'NOT status:done NOT status:cancelled roast',
    );
  });

  test('no value writes every value hidden', ({ expect }) => {
    expect(parseEnumTerms(writeEnumTerms('', status, []), status).values).to.deep.eq([]);
  });

  test('replaces the terms already there and keeps the rest', ({ expect }) => {
    expect(writeEnumTerms('status:done #urgent roast', status, ['todo'])).to.eq('status:todo #urgent roast');
  });

  test('round-trips every subset through the text', ({ expect }) => {
    for (let mask = 0; mask < 1 << STATUSES.length; mask++) {
      const selected = STATUSES.filter((_, index) => mask & (1 << index));
      const { values = STATUSES, rest } = parseEnumTerms(writeEnumTerms('roast', status, selected), status);
      expect(values).to.deep.eq(selected);
      expect(rest).to.eq('roast');
    }
  });
});
