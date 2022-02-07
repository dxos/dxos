//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createTestInstance } from '@dxos/echo-db';
import { Matcher, Predicate } from '@dxos/object-model';

import { Generator, OBJECT_PERSON } from './generator';

test('generator', async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();
  const generator = new Generator(party.database, { seed: 100 });
  await generator.generate({
    numPeople: 3
  });

  const query = party.database.select({ type: OBJECT_PERSON }).query();
  expect(query.result).toHaveLength(3);

  const names = query.result.map(item => item.model.getProperty('name'));
  expect(names).toHaveLength(3);

  await echo.close();
});

test('filter', async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();
  const generator = new Generator(party.database, { seed: 100 });
  await generator.generate({
    numPeople: 3
  });

  const query = {
    root: {
      op: Predicate.Operation.TEXT_MATCH,
      key: 'name',
      value: {
        string: 'Karianne'
      }
    }
  };
  const matcher = new Matcher({ getter: (item: any, key: string) => item.model.getProperty(key) });
  const queryResult = party.database.select({ type: OBJECT_PERSON }).filter(matcher.getFilter(query)).query();
  expect(queryResult.result).toHaveLength(1);

  await echo.close();
});
