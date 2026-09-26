//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { QueryBuilder, parseEnumTerms } from '@dxos/echo-query';

import { ALL_STATUSES, STATUS_TERMS, foldStatuses } from './status.ts';

const hidden = (...statuses: string[]) => ALL_STATUSES.filter((status) => !statuses.includes(status));

describe('foldStatuses', () => {
  test('writes the choice into the query', ({ expect }) => {
    expect(foldStatuses('roast', hidden('done'))).to.eq('NOT status:done roast');
  });

  test('every status leaves the query as it is', ({ expect }) => {
    expect(foldStatuses('a OR b', ALL_STATUSES)).to.eq('a OR b');
  });

  test('groups a query with a top-level OR so the choice is kept', ({ expect }) => {
    const query = foldStatuses('title:a OR title:b', hidden('done'));
    expect(query).to.eq('NOT status:done (title:a OR title:b)');
    expect(parseEnumTerms(query, STATUS_TERMS).values).to.deep.eq(hidden('done'));
    expect(new QueryBuilder().build(query).filter).to.exist;
  });
});
