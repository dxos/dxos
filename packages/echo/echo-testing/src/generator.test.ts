//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createTestInstance } from '@dxos/echo-db';
import { Matcher } from '@dxos/object-model';
import { Predicate } from '@dxos/protocols/proto/dxos/echo/model/object';

import { Generator, OBJECT_PERSON } from './generator';

test('generator', async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();
  const generator = new Generator(party.database, { seed: 100 });
  await generator.generate({
    numPeople: 3
  });

  const result = party.database.select({ type: OBJECT_PERSON }).exec();
  expect(result.entities).toHaveLength(3);

  const names = result.entities.map(item => item.model.get('name'));
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
  const matcher = new Matcher({ getter: (item: any, key: string) => item.model.get(key) });
  const queryResult = party.database.select({ type: OBJECT_PERSON }).filter(matcher.getFilter(query)).exec();
  expect(queryResult.entities).toHaveLength(1);

  await echo.close();
});
