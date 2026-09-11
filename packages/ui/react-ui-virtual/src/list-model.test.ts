//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { ListModel } from './list-model.ts';

const create = (count = 5) =>
  new ListModel<{ id: string }>({
    items: Array.from({ length: count }, (_, index) => ({ id: `row-${index}` })),
    getId: (item) => item.id,
  });

describe('ListModel', () => {
  test('a prepend is told, never inferred', () => {
    const model = create();
    const changes: unknown[] = [];
    model.subscribe((change) => changes.push(change));

    model.prepend([{ id: 'earlier-0' }, { id: 'earlier-1' }]);

    expect(changes).to.deep.eq([{ prepended: 2 }]);
    expect(model.getId(0)).to.eq('earlier-0');
    expect(model.getId(2)).to.eq('row-0');
  });

  test('replace recovers the prepend for a caller that does not know', () => {
    // The one place the identity scan survives: a host handing over a whole new array. The model
    // works out that everything before the old first row was prepended, so the virtualizer is
    // still told rather than left to infer.
    const model = create(3);
    const changes: unknown[] = [];
    model.subscribe((change) => changes.push(change));

    model.replace([{ id: 'earlier-0' }, { id: 'row-0' }, { id: 'row-1' }, { id: 'row-2' }]);

    expect(changes).to.deep.eq([{ prepended: 1, appended: undefined }]);
  });

  test('replace reads growth at the end as an append', () => {
    const model = create(3);
    const changes: unknown[] = [];
    model.subscribe((change) => changes.push(change));

    model.replace([{ id: 'row-0' }, { id: 'row-1' }, { id: 'row-2' }, { id: 'later-0' }]);

    expect(changes).to.deep.eq([{ prepended: undefined, appended: 1 }]);
  });

  test('patch replaces a frozen item under its own identity', () => {
    const model = create(3);
    const changes: unknown[] = [];
    model.subscribe((change) => changes.push(change));

    model.patch('row-1', { id: 'row-1' });
    // A patch that would change identity is refused: it would strand measurements and selection.
    model.patch('row-2', { id: 'imposter' });

    expect(changes).to.deep.eq([{ updated: ['row-1'] }]);
    expect(model.getId(2)).to.eq('row-2');
  });

  test('the atom face tracks the same rows', () => {
    const model = create(2);
    model.append([{ id: 'later-0' }]);

    expect(model.count).to.eq(3);
    expect(model.items.map((item) => item.id)).to.deep.eq(['row-0', 'row-1', 'later-0']);
  });
});
